import React, {
	forwardRef,
	useEffect,
	useImperativeHandle,
	useRef,
	useState,
} from "react";
import { useRecoilValue } from "recoil";
import {
	titleSelector,
	backgroundColorAtom,
	customRequestGraphState,
	exportFileNameSelector,
	selectedFontAtom,
	textColorAtom,
	exportUsePureAtom,
} from "../state/atoms.js";

const UPSCALE_PR = 2;
const MAX_RASTER_SIDE = 8000;
const PURE_MAX_SIDE = 16384;
const PURE_MAX_AREA = 268435456;

function computeResamplePixelRatio(width, height, basePr) {
	const maxSide = Math.max(width || 1, height || 1);
	const cap = Math.max(1, Math.floor(MAX_RASTER_SIDE / maxSide));
	return Math.max(1, Math.min(basePr, cap));
}

function isCanvasSizeSafe(w, h, maxSide, maxArea) {
	if (!(w > 0 && h > 0)) return false;
	if (w > maxSide || h > maxSide) return false;
	if (w * h > maxArea) return false;
	return true;
}

const GraphView = forwardRef(function GraphView({ containerRef }, ref) {
	const drawTimerRef = useRef(null);
	const [googleReady, setGoogleReady] = useState(false);
	const graph = useRecoilValue(customRequestGraphState);

	const exportBg = useRecoilValue(backgroundColorAtom);
	const exportTextColor = useRecoilValue(textColorAtom);
	const exportFontFamily = useRecoilValue(selectedFontAtom);
	const exportText = useRecoilValue(titleSelector);
	const exportName = useRecoilValue(exportFileNameSelector);
	const usePure = useRecoilValue(exportUsePureAtom);

	const chartRef = useRef(null);
	const dataTableRef = useRef(null);
	const baseOptionsRef = useRef(null);
	const [canDownload, setCanDownload] = useState(false);

	useEffect(() => {
		const ensureLoader = () =>
			new Promise((resolve, reject) => {
				if (window.google?.charts) return resolve();
				const tag = document.createElement("script");
				tag.src = "https://www.gstatic.com/charts/loader.js";
				tag.onload = () => resolve();
				tag.onerror = (e) => reject(e);
				document.head.appendChild(tag);
			});

		const loadAndInit = async () => {
			try {
				await ensureLoader();
				if (!window.google?.charts)
					throw new Error("charts loader missing");
				window.google.charts.load("current", { packages: ["sankey"] });
				await new Promise((res) =>
					window.google.charts.setOnLoadCallback(res)
				);
				console.log("[SankeyView] google ready");
				setGoogleReady(true);
			} catch (err) {
				console.error("[SankeyView] loader error", err);
			}
		};
		loadAndInit();
		return () => {
			if (drawTimerRef.current) {
				clearTimeout(drawTimerRef.current);
				drawTimerRef.current = null;
			}
		};
	}, []);

	useEffect(() => {
		if (!graph) return;
		if (!containerRef?.current) return;
		if (!googleReady) return;

		const sankey = graph?.sankey;
		if (!sankey?.rows || !Array.isArray(sankey.rows)) return;

		const draw = () => {
			try {
				const el = containerRef.current;
				const { google } = window;
				const dataTable = new google.visualization.DataTable();
				dataTable.addColumn("string", "From");
				dataTable.addColumn("string", "To");
				dataTable.addColumn("number", "Weight");
				dataTable.addRows(sankey.rows);
				dataTableRef.current = dataTable;

				const chart = new google.visualization.Sankey(el);
				chartRef.current = chart;

				const dynamicHeight = Math.max(sankey.rows.length * 30, 400);
				const defaultOptions = {
					width: el.clientWidth,
					height: dynamicHeight,
					backgroundColor: sankey.options?.backgroundColor,
					sankey: {
						node: {
							nodePadding: 20,
							label: sankey.options?.sankey?.node?.label,
						},
						link: { colorMode: "source", curvature: 0.3 },
					},
				};
				const options = {
					...defaultOptions,
					...(sankey.options || {}),
					sankey: {
						...defaultOptions.sankey,
						...(sankey.options?.sankey || {}),
						node: {
							...defaultOptions.sankey.node,
							...(sankey.options?.sankey?.node || {}),
						},
						link: {
							...defaultOptions.sankey.link,
							...(sankey.options?.sankey?.link || {}),
						},
					},
				};
				baseOptionsRef.current = options;
				console.log("[SankeyView] draw", { rows: sankey.rows.length });
				chart.draw(dataTable, options);
				setCanDownload(true);
			} catch (err) {
				console.error("[SankeyView] draw error", err);
			}
		};

		draw();

		const onResize = () => {
			if (drawTimerRef.current) clearTimeout(drawTimerRef.current);
			drawTimerRef.current = setTimeout(() => {
				console.log("[SankeyView] resize redraw");
				draw();
			}, 200);
		};
		window.addEventListener("resize", onResize);

		return () => {
			window.removeEventListener("resize", onResize);
			if (drawTimerRef.current) {
				clearTimeout(drawTimerRef.current);
				drawTimerRef.current = null;
			}
			chartRef.current = null;
			dataTableRef.current = null;
			baseOptionsRef.current = null;
			setCanDownload(false);
		};
	}, [graph, containerRef, googleReady]);

	useImperativeHandle(ref, () => ({
		updateColors: (nodeColors) => {
			try {
				if (
					!chartRef.current ||
					!dataTableRef.current ||
					!baseOptionsRef.current
				)
					return;
				const baseOptions = baseOptionsRef.current;
				const options = {
					...baseOptions,
					sankey: {
						...baseOptions.sankey,
						node: {
							...baseOptions.sankey.node,
							colors: nodeColors,
						},
						link: {
							...baseOptions.sankey.link,
							colors: nodeColors,
							colorMode: "source",
						},
					},
				};
				console.log("[SankeyView] updateColors");
				chartRef.current.draw(dataTableRef.current, options);
			} catch (err) {
				console.error("[SankeyView] updateColors error", err);
			}
		},

		downloadPng: () => {
			try {
				const el = containerRef.current;
				if (!el) return;
				const svg = getSankeySvgFrom(el);
				if (!svg) return;

				const clone = svg.cloneNode(true);
				inlineSvgNamespace(clone);
				const { width: baseW, height: baseH } = getSvgSize(clone);
				console.log("[SankeyView] downloadPng base size", {
					width: baseW,
					height: baseH,
				});

				const { outW, outH, scale } = computeSafeSize(
					baseW,
					baseH,
					usePure
				);

				const layout = computeFooterLayout({
					title: exportText || "",
					width: outW,
					fontFamily: exportFontFamily || "Mono",
					minFont: 16,
					maxFont: Math.floor(outW * 0.06),
				});

				const dpr = Math.max(
					1,
					Math.floor(window.devicePixelRatio || 1)
				);
				const outerMargin = 32;

				if (usePure) {
					const finalW = (outW + outerMargin * 2) * dpr;
					const finalH = (outH + outerMargin + layout.footerH) * dpr;
					if (
						!isCanvasSizeSafe(
							finalW,
							finalH,
							PURE_MAX_SIDE,
							PURE_MAX_AREA
						) ||
						!isCanvasSizeSafe(
							outW,
							outH,
							PURE_MAX_SIDE,
							PURE_MAX_AREA
						)
					) {
						alert(
							`Export failed in Raw (1:1).\n` +
								`Base SVG: ${baseW}×${baseH}px\n` +
								`Output: ${outW}×${outH}px @ ${scale}x\n` +
								`Image is too large to render safely.\n` +
								`Reduce the graph size or disable "Raw Export" to use Resampled (HQ).`
						);
						return;
					}
				}

				const canvas = document.createElement("canvas");
				const ctx = canvas.getContext("2d");

				canvas.width = (outW + outerMargin * 2) * dpr;
				canvas.height = (outH + outerMargin + layout.footerH) * dpr;
				canvas.style.width = `${outW + outerMargin * 2}px`;
				canvas.style.height = `${
					outH + outerMargin + layout.footerH
				}px`;

				ctx.scale(dpr, dpr);
				ctx.fillStyle = exportBg || "#ffffff";
				ctx.fillRect(0, 0, canvas.width / dpr, canvas.height / dpr);

				const rasterPr = usePure
					? 1
					: computeResamplePixelRatio(outW, outH, UPSCALE_PR);

				svgToPngImage(
					clone,
					outW,
					outH,
					exportBg || "#ffffff",
					rasterPr
				)
					.then((img) => {
						try {
							ctx.drawImage(
								img,
								outerMargin,
								outerMargin,
								outW,
								outH
							);

							ctx.fillStyle = exportTextColor || "#000000";
							const labelFontPx = 10;
							ctx.font = `${labelFontPx}px ${
								exportFontFamily || "Mono"
							}`;
							ctx.textAlign = "left";
							ctx.textBaseline = "middle";
							const topLabelX = outerMargin - 10;
							const topLabelY = outerMargin / 2;
							ctx.fillText("", topLabelX, topLabelY);

							ctx.fillStyle = exportTextColor || "#000000";
							ctx.textAlign = "center";
							ctx.textBaseline = "alphabetic";
							ctx.font = `bold ${layout.fontSize}px ${
								exportFontFamily || "Mono"
							}`;
							const cx = outerMargin + outW / 2;
							let y =
								outerMargin +
								outH +
								layout.vPad +
								layout.fontSize;
							if (layout.lines.length === 1) {
								ctx.fillText(layout.lines[0], cx, y);
							} else {
								for (let i = 0; i < layout.lines.length; i++) {
									ctx.fillText(
										layout.lines[i],
										cx,
										y + i * layout.lineHeight
									);
								}
							}

							const a = document.createElement("a");
							a.href = canvas.toDataURL("image/png");
							a.download = exportName || "sankey.png";
							document.body.appendChild(a);
							a.click();
							a.remove();
							console.log("[SankeyView] downloadPng ok", {
								title: exportText,
								fontSize: layout.fontSize,
								lines: layout.lines.length,
								pure: usePure,
								scale,
								outW,
								outH,
								rasterPr,
							});
						} catch (e) {
							console.error(
								"[SankeyView] downloadPng draw error",
								e
							);
						}
					})
					.catch((e) => {
						const mode = usePure ? "Raw (1:1)" : "Resampled (HQ)";
						alert(
							`Export failed in ${mode}.\n` +
								`Base SVG: ${baseW}×${baseH}px\n` +
								`Output: ${outW}×${outH}px @ ${scale}x\n` +
								`Image is too large to render safely.\n` +
								`${
									usePure
										? 'Turn off "Raw Export" to use Resampled (HQ), or reduce the graph size.'
										: "Reduce the graph size and try again."
								}`
						);

						console.error(
							"[SankeyView] downloadPng image load error",
							e
						);
					});
			} catch (err) {
				console.error("[SankeyView] downloadPng error", err);
			}
		},

		downloadSvgWrapped: () => {
			try {
				const el = containerRef.current;
				if (!el) return;
				const svg = getSankeySvgFrom(el);
				if (!svg) return;

				const clone = svg.cloneNode(true);
				inlineSvgNamespace(clone);
				const { width: baseW, height: baseH } = getSvgSize(clone);
				console.log("[SankeyView] downloadSvgWrapped base size", {
					width: baseW,
					height: baseH,
				});

				const { outW, outH, scale } = computeSafeSize(
					baseW,
					baseH,
					usePure
				);

				const layout = computeFooterLayout({
					title: exportText || "",
					width: outW,
					fontFamily: exportFontFamily || "Mono",
					minFont: 16,
					maxFont: Math.floor(outW * 0.06),
				});

				const topPad = 32;
				const wrapperH = topPad + outH + layout.footerH;
				const labelFontPx = 10;
				const labelX = 12;
				const labelY = topPad / 2;

				if (usePure) {
					const xml = new XMLSerializer().serializeToString(clone);
					const dataUri = svgToDataUri(xml);

					const footerElements =
						layout.lines.length === 1
							? `<text x="${outW / 2}" y="${
									topPad + layout.vPad + layout.fontSize
							  }" text-anchor="middle" font-family="${escapeXml(
									exportFontFamily || "Mono"
							  )}" font-size="${
									layout.fontSize
							  }" font-weight="700" fill="${escapeXml(
									exportTextColor || "#000000"
							  )}">${escapeXml(layout.lines[0])}</text>`
							: layout.lines
									.map((line, i) => {
										const y =
											topPad +
											layout.vPad +
											layout.fontSize +
											i * layout.lineHeight;
										return `<text x="${
											outW / 2
										}" y="${y}" text-anchor="middle" font-family="${escapeXml(
											exportFontFamily || "Mono"
										)}" font-size="${
											layout.fontSize
										}" font-weight="700" fill="${escapeXml(
											exportTextColor || "#000000"
										)}">${escapeXml(line)}</text>`;
									})
									.join("");

					const wrapper = `
<svg xmlns="http://www.w3.org/2000/svg" width="${outW}" height="${wrapperH}">
  <rect x="0" y="0" width="${outW}" height="${wrapperH}" fill="${escapeXml(
						exportBg || "#ffffff"
					)}" />
  <text x="${labelX}" y="${labelY}" text-anchor="start" dominant-baseline="middle" font-family="${escapeXml(
						exportFontFamily || "Mono"
					)}" font-size="${labelFontPx}" fill="${escapeXml(
						exportTextColor || "#000000"
					)}">hecho con el sankilizer</text>
  <image href="${dataUri}" x="0" y="${topPad}" width="${outW}" height="${outH}" />
  ${footerElements}
</svg>`.trim();

					const blob = new Blob([wrapper], {
						type: "image/svg+xml;charset=utf-8",
					});
					const url = URL.createObjectURL(blob);
					const a = document.createElement("a");
					a.href = url;
					const name =
						(exportName || "sankey.png").replace(/\.png$/i, "") +
						".svg";
					a.download = name;
					document.body.appendChild(a);
					a.click();
					a.remove();
					URL.revokeObjectURL(url);
					console.log("[SankeyView] downloadSvgWrapped ok (pure)", {
						title: exportText,
						pure: usePure,
						scale,
					});
				} else {
					const rasterPr = computeResamplePixelRatio(
						outW,
						outH,
						UPSCALE_PR
					);

					svgToPngDataUrl(
						clone,
						outW,
						outH,
						exportBg || "#ffffff",
						rasterPr
					)
						.then((pngDataUri) => {
							const footerElements =
								layout.lines.length === 1
									? `<text x="${outW / 2}" y="${
											topPad +
											layout.vPad +
											layout.fontSize
									  }" text-anchor="middle" font-family="${escapeXml(
											exportFontFamily || "Mono"
									  )}" font-size="${
											layout.fontSize
									  }" font-weight="700" fill="${escapeXml(
											exportTextColor || "#000000"
									  )}">${escapeXml(layout.lines[0])}</text>`
									: layout.lines
											.map((line, i) => {
												const y =
													topPad +
													layout.vPad +
													layout.fontSize +
													i * layout.lineHeight;
												return `<text x="${
													outW / 2
												}" y="${y}" text-anchor="middle" font-family="${escapeXml(
													exportFontFamily || "Mono"
												)}" font-size="${
													layout.fontSize
												}" font-weight="700" fill="${escapeXml(
													exportTextColor || "#000000"
												)}">${escapeXml(line)}</text>`;
											})
											.join("");

							const wrapper = `
<svg xmlns="http://www.w3.org/2000/svg" width="${outW}" height="${wrapperH}">
  <rect x="0" y="0" width="${outW}" height="${wrapperH}" fill="${escapeXml(
								exportBg || "#ffffff"
							)}" />
  <text x="${labelX}" y="${labelY}" text-anchor="start" dominant-baseline="middle" font-family="${escapeXml(
								exportFontFamily || "Mono"
							)}" font-size="${labelFontPx}" fill="${escapeXml(
								exportTextColor || "#000000"
							)}">hecho con el sankilizer</text>
  <image href="${pngDataUri}" x="0" y="${topPad}" width="${outW}" height="${outH}" />
  ${footerElements}
</svg>`.trim();

							const blob = new Blob([wrapper], {
								type: "image/svg+xml;charset=utf-8",
							});
							const url = URL.createObjectURL(blob);
							const a = document.createElement("a");
							a.href = url;
							const name =
								(exportName || "sankey.png").replace(
									/\.png$/i,
									""
								) + ".svg";
							a.download = name;
							document.body.appendChild(a);
							a.click();
							a.remove();
							URL.revokeObjectURL(url);
							console.log(
								"[SankeyView] downloadSvgWrapped ok (resample)",
								{
									title: exportText,
									pure: usePure,
									scale,
									rasterPr,
								}
							);
						})
						.catch((e) =>
							console.error(
								"[SankeyView] downloadSvgWrapped resample error",
								e
							)
						);
				}
			} catch (err) {
				console.error("[SankeyView] downloadSvgWrapped error", err);
			}
		},
	}));

	return (
		<div
			className="fixed inset-0 z-0"
			style={{
				top: "var(--app-header-h)",
				left: 0,
				backgroundColor: exportBg,
			}}
		>
			<div
				ref={containerRef}
				className="absolute inset-0 overflow-y-scroll scrollbar-custom"
			/>
		</div>
	);
});

export default GraphView;

function getSankeySvgFrom(el) {
	if (!el) return null;
	return el.querySelector("svg");
}

function inlineSvgNamespace(svg) {
	if (!svg) return;
	if (!svg.getAttribute("xmlns"))
		svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
	if (!svg.getAttribute("xmlns:xlink"))
		svg.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");
}

function getSvgSize(svg) {
	const w = parseFloat(svg.getAttribute("width") || "0");
	const h = parseFloat(svg.getAttribute("height") || "0");
	return { width: w, height: h };
}

function computeFooterLayout({
	title,
	width,
	fontFamily,
	minFont = 16,
	maxFont = 64,
}) {
	const usableW = width * 0.7;
	const temp = document.createElement("canvas");
	const ctx = temp.getContext("2d");
	const measureAt = (size, text) => {
		ctx.font = `bold ${size}px ${fontFamily}`;
		return ctx.measureText(text).width;
	};
	ctx.font = `bold 100px ${fontFamily}`;
	const w100 = ctx.measureText(title).width || 1;
	let oneLineSize = Math.floor((usableW / w100) * 100);
	oneLineSize = Math.min(Math.max(oneLineSize, 1), maxFont);
	if (oneLineSize >= minFont || !title.includes(" ")) {
		const fontSize = Math.min(oneLineSize, maxFont);
		const lineHeight = Math.ceil(fontSize * 1.3);
		const vPad = Math.round(fontSize * 0.75);
		const footerH = vPad * 2 + lineHeight;
		return { lines: [title], fontSize, lineHeight, vPad, footerH };
	}
	const words = title.split(/\s+/);
	let best = { fontSize: 0, lines: [title] };
	for (let i = 1; i < words.length; i++) {
		const l1 = words.slice(0, i).join(" ");
		const l2 = words.slice(i).join(" ");
		const m1 = measureAt(100, l1) || 1;
		const m2 = measureAt(100, l2) || 1;
		const maxAt100 = Math.max(m1, m2);
		let fs = Math.floor((usableW / maxAt100) * 100);
		fs = Math.min(fs, maxFont);
		if (fs > best.fontSize) best = { fontSize: fs, lines: [l1, l2] };
	}
	let fontSize = best.fontSize;
	if (fontSize < 1) fontSize = minFont;
	const lineHeight = Math.ceil(fontSize * 1.3);
	const vPad = Math.round(fontSize * 0.75);
	const footerH = vPad * 2 + lineHeight * best.lines.length;
	return { lines: best.lines, fontSize, lineHeight, vPad, footerH };
}

function svgToDataUri(svgXml) {
	const encoded = encodeURIComponent(svgXml).replace(
		/%([0-9A-F]{2})/g,
		(m, p1) => String.fromCharCode("0x" + p1)
	);
	const base64 = btoa(encoded);
	return `data:image/svg+xml;base64,${base64}`;
}

function escapeXml(s) {
	return String(s)
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&apos;");
}

function computeSafeSize(w, h, usePure) {
	const MAX_SIDE = 4000;
	if (usePure)
		return {
			outW: Math.max(1, Math.round(w)),
			outH: Math.max(1, Math.round(h)),
			scale: 1,
		};
	const maxIn = Math.max(w, h) || 1;
	const scale = Math.min(1, MAX_SIDE / maxIn);
	return {
		outW: Math.max(1, Math.round(w * scale)),
		outH: Math.max(1, Math.round(h * scale)),
		scale,
	};
}

function svgToPngImage(svgNode, width, height, bg = "#ffffff", pixelRatio = 1) {
	return new Promise((resolve, reject) => {
		try {
			const xml = new XMLSerializer().serializeToString(svgNode);
			const svgBlob = new Blob([xml], {
				type: "image/svg+xml;charset=utf-8",
			});
			const url = URL.createObjectURL(svgBlob);
			const img = new Image();
			img.decoding = "async";
			img.onload = () => {
				URL.revokeObjectURL(url);
				const tw = Math.min(
					MAX_RASTER_SIDE,
					Math.max(1, Math.round(width * pixelRatio))
				);
				const th = Math.min(
					MAX_RASTER_SIDE,
					Math.max(1, Math.round(height * pixelRatio))
				);
				const tmp = document.createElement("canvas");
				tmp.width = tw;
				tmp.height = th;
				const tctx = tmp.getContext("2d");
				if (bg) {
					tctx.fillStyle = bg;
					tctx.fillRect(0, 0, tw, th);
				}
				tctx.drawImage(img, 0, 0, tw, th);
				const out = new Image();
				out.onload = () => resolve(out);
				out.onerror = reject;
				out.src = tmp.toDataURL("image/png");
			};
			img.onerror = (e) => {
				URL.revokeObjectURL(url);
				reject(e);
			};
			img.src = url;
		} catch (e) {
			reject(e);
		}
	});
}

function svgToPngDataUrl(
	svgNode,
	width,
	height,
	bg = "#ffffff",
	pixelRatio = 1
) {
	return new Promise((resolve, reject) => {
		svgToPngImage(svgNode, width, height, bg, pixelRatio)
			.then((img) => {
				try {
					const c = document.createElement("canvas");
					c.width = Math.max(1, Math.round(width));
					c.height = Math.max(1, Math.round(height));
					const ctx = c.getContext("2d");
					if (bg) {
						ctx.fillStyle = bg;
						ctx.fillRect(0, 0, c.width, c.height);
					}
					ctx.drawImage(img, 0, 0, c.width, c.height);
					resolve(c.toDataURL("image/png"));
				} catch (e) {
					reject(e);
				}
			})
			.catch(reject);
	});
}
