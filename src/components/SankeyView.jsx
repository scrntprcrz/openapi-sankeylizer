import React, { useEffect, useRef, useState } from "react";
import { useRecoilValue } from "recoil";
import { customRequestGraphState } from "../state/atoms.js";
import { ArrowDownTrayIcon } from "@heroicons/react/24/outline";

function getSankeySvgFrom(el) {
	if (!el) return null;
	return el.querySelector("svg");
}

function inlineSvgNamespace(svg) {
	if (!svg.getAttribute("xmlns"))
		svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
	if (!svg.getAttribute("xmlns:xlink"))
		svg.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");
	return svg;
}

async function svgToPngDataUrl(svgEl, bg = "white") {
	const svg = inlineSvgNamespace(svgEl.cloneNode(true));

	let width =
		parseFloat(svg.getAttribute("width")) ||
		svg.viewBox?.baseVal?.width ||
		svgEl.clientWidth ||
		1000;
	let height =
		parseFloat(svg.getAttribute("height")) ||
		svg.viewBox?.baseVal?.height ||
		svgEl.clientHeight ||
		1000;

	const serializer = new XMLSerializer();
	const svgStr = serializer.serializeToString(svg);
	const svgBlob = new Blob([svgStr], { type: "image/svg+xml;charset=utf-8" });
	const url = URL.createObjectURL(svgBlob);

	const img = new Image();
	img.decoding = "async";
	img.loading = "eager";

	const dataUrl = await new Promise((resolve, reject) => {
		img.onload = () => {
			try {
				const canvas = document.createElement("canvas");
				canvas.width = Math.ceil(width);
				canvas.height = Math.ceil(height);
				const ctx = canvas.getContext("2d");
				if (bg) {
					ctx.fillStyle = bg;
					ctx.fillRect(0, 0, canvas.width, canvas.height);
				}
				ctx.drawImage(img, 0, 0);
				const out = canvas.toDataURL("image/png");
				URL.revokeObjectURL(url);
				resolve(out);
			} catch (err) {
				URL.revokeObjectURL(url);
				reject(err);
			}
		};
		img.onerror = (e) => {
			URL.revokeObjectURL(url);
			reject(e);
		};
		img.src = url;
	});
	return dataUrl;
}

export default function GraphView({ containerRef }) {
	const drawTimerRef = useRef(null);
	const [googleReady, setGoogleReady] = useState(false);
	const graph = useRecoilValue(customRequestGraphState);

	const chartRef = useRef(null);
	const [canDownload, setCanDownload] = useState(false);

	useEffect(() => {
		const ensureLoader = () =>
			new Promise((resolve, reject) => {
				if (window.google?.charts) return resolve();
				let tag = document.querySelector(
					'script[data-googlecharts-loader="1"]'
				);
				if (!tag) {
					tag = document.createElement("script");
					tag.src = "https://www.gstatic.com/charts/loader.js";
					tag.async = true;
					tag.defer = true;
					tag.setAttribute("data-googlecharts-loader", "1");
					tag.onload = () => resolve();
					tag.onerror = (e) => reject(e);
					document.head.appendChild(tag);
				} else {
					tag.onload = () => resolve();
					tag.onerror = (e) => reject(e);
				}
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
				setGoogleReady(true);
			} catch {}
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

				const chart = new google.visualization.Sankey(el);
				chartRef.current = chart;

				const dynamicHeight = Math.max(sankey.rows.length * 30, 400);
				const defaultOptions = {
					width: el.clientWidth,
					height: dynamicHeight,
					sankey: {
						node: { nodePadding: 20 },
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
					},
				};

				window.google.visualization.events.addListener(
					chart,
					"ready",
					() => {
						setCanDownload(true);
					}
				);

				chart.draw(dataTable, options);
			} catch {}
		};

		draw();

		const onResize = () => {
			if (drawTimerRef.current) clearTimeout(drawTimerRef.current);
			drawTimerRef.current = setTimeout(draw, 200);
		};
		window.addEventListener("resize", onResize);

		return () => {
			window.removeEventListener("resize", onResize);
			if (drawTimerRef.current) {
				clearTimeout(drawTimerRef.current);
				drawTimerRef.current = null;
			}
			chartRef.current = null;
			setCanDownload(false);
		};
	}, [graph, containerRef, googleReady]);

	const onDownload = async () => {
		try {
			const el = containerRef?.current;
			const svg = getSankeySvgFrom(el);
			if (!svg) return;
			const dataUrl = await svgToPngDataUrl(svg, "white");
			const a = document.createElement("a");
			a.href = dataUrl;
			a.download = "openapi-sankey.png";
			document.body.appendChild(a);
			a.click();
			a.remove();
		} catch {}
	};

	return (
		<div
			className="fixed inset-0 z-0"
			style={{ top: "var(--app-header-h)", left: 0 }}
		>
			<div
				ref={containerRef}
				className="absolute inset-0 overflow-y-scroll"
			/>
			{canDownload && (
				<button
					type="button"
					onClick={onDownload}
					className="fixed z-10000 px-3 py-2 rounded-md shadow-lg bg-black/80 text-white hover:bg-black"
					aria-label="Download PNG"
					title="Download PNG"
					style={{
						top: "calc(var(--app-header-h) + 1rem)",
						left: "1rem",
					}}
				>
					<ArrowDownTrayIcon className="w-5 h-5" aria-hidden="true" />
				</button>
			)}
		</div>
	);
}
