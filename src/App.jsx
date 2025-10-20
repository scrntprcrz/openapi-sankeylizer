import React, { useEffect, useRef, useState } from "react";
import { useRecoilState, useRecoilValue, useSetRecoilState } from "recoil";
import AppHeader from "./components/AppHeader.jsx";
import ExampleOpenApiLinks from "./components/ExampleOpenApiLinks.jsx";
import KBarActionsRegistrar from "./components/KBarActionsRegistrar.jsx";
import SankeyView from "./components/SankeyView.jsx";
import KBarRoot from "./providers/KBarRoot.jsx";
import SpecCutterModal from "./components/SpecCutterModal.jsx";

import {
	backgroundColorAtom,
	customRequestGraphState,
	dimColorAtom,
	graphTypeState,
	hasGraphState,
	hideUnselectedState,
	kbarNodesSelector,
	selectedColorAtom,
	selectedFontAtom,
	exportUsePureAtom,
	selectedNodesState,
} from "./state/atoms.js";

export default function App() {
	const containerRef = useRef(null);
	const graphRef = useRef(null);
	const fileInputRef = useRef(null);

	const workerRef = useRef(null);
	const lastSpecRef = useRef(null);
	const [hasGraph, setHasGraph] = useRecoilState(hasGraphState);
	const [isLoadingExample, setIsLoadingExample] = useState(false);
	const setGraphType = useSetRecoilState(graphTypeState);
	const setCustomRequestGraph = useSetRecoilState(customRequestGraphState);
	const [selectedNodes, setSelectedNodes] =
		useRecoilState(selectedNodesState);
	const [hideUnselected, setHideUnselected] =
		useRecoilState(hideUnselectedState);
	const kbarNodes = useRecoilValue(kbarNodesSelector);
	const backgroundColor = useRecoilValue(backgroundColorAtom);
	const selectedColor = useRecoilValue(selectedColorAtom);
	const dimColor = useRecoilValue(dimColorAtom);
	const fontFamily = useRecoilValue(selectedFontAtom);
	const lastGraphRef = useRef(null);
	const [isProcessing, setIsProcessing] = useState(false);
	const setExportUsePure = useSetRecoilState(exportUsePureAtom);

	const hideUnselectedRef = useRef(hideUnselected);
	const selectedNodesRef = useRef(selectedNodes);

	const [isCutterOpen, setIsCutterOpen] = useState(false);
	const [cutterRoot, setCutterRoot] = useState(null);

	useEffect(() => {
		hideUnselectedRef.current = hideUnselected;
	}, [hideUnselected]);

	useEffect(() => {
		selectedNodesRef.current = selectedNodes;
	}, [selectedNodes]);

	useEffect(() => {
		console.log("[init] starting worker");
		const worker = new Worker(
			new URL("./sinMockerizer.js", import.meta.url),
			{
				type: "module",
			}
		);

		worker.onmessage = (event) => {
			const { type, graph, message } = event.data || {};
			console.log("[worker] message", { type, hasGraph: !!graph });
			if (type === "graph" && graph) {
				setIsProcessing(false);

				console.log("[worker] onmessage:graph", {
					rows: graph?.sankey?.rows?.length,
					list: graph?.list?.length,
					hideUnselected: hideUnselectedRef.current,
				});

				const previous = lastGraphRef.current;
				const sameStructure =
					previous &&
					!hideUnselectedRef.current &&
					graph?.sankey?.rows?.length ===
						previous?.sankey?.rows?.length;

				const prevOpts = previous?.sankey?.options;
				const newOpts = graph?.sankey?.options;
				const bgChanged =
					prevOpts?.backgroundColor !== newOpts?.backgroundColor;
				const fontChanged =
					prevOpts?.sankey?.node?.label?.fontName !==
					newOpts?.sankey?.node?.label?.fontName;
				const labelColorChanged =
					prevOpts?.sankey?.node?.label?.color !==
					newOpts?.sankey?.node?.label?.color;
				const nonColorOptionsChanged =
					bgChanged || fontChanged || labelColorChanged;

				if (
					sameStructure &&
					graphRef.current &&
					Array.isArray(newOpts?.sankey?.node?.colors) &&
					!nonColorOptionsChanged
				) {
					console.log("[worker] repaint-only -> updateColors");
					const nodeColors = newOpts.sankey.node.colors;
					graphRef.current.updateColors(nodeColors);
					lastGraphRef.current = {
						...previous,
						sankey: { ...previous.sankey, options: newOpts },
					};
				} else {
					console.log("[worker] apply full graph update");
					setCustomRequestGraph(graph);

					lastGraphRef.current = graph;
				}

				setGraphType("request");
				console.log(
					"[kbar] list length from graph",
					graph?.list?.length
				);
				setHasGraph(true);
			} else if (type === "error") {
				console.error("Error generando el grafo:", message);
				if (
					message &&
					String(message).toLowerCase().includes("cache")
				) {
					const spec = lastSpecRef.current;
					if (spec) {
						const highlights = (selectedNodesRef.current || []).map(
							(id) => ({ id, color: selectedColor })
						);
						console.warn(
							"[app] cache miss, recalculating from spec"
						);
						setIsProcessing(true);
						workerRef.current?.postMessage({
							type: "generate",
							spec,
							highlights,
							dimColor,
							hideUnselected: hideUnselectedRef.current,
							backgroundColor,
							selectedColor,
							fontFamily,
						});
					}
				}
			}
		};

		workerRef.current = worker;
		return () => {
			console.log("[cleanup] terminating worker");
			worker.terminate();
		};
	}, [setCustomRequestGraph, setGraphType]);

	const applySelection = () => {
		if (!hasGraph || !lastGraphRef.current || isProcessing) return;
		const highlights = (selectedNodes || []).map((id) => ({
			id,
			color: selectedColor,
		}));
		console.log("[kbar] applySelection", {
			count: highlights.length,
			hideUnselected: hideUnselectedRef.current,
			bg: backgroundColor,
			dim: dimColor,
			sel: selectedColor,
			font: fontFamily,
		});
		workerRef.current?.postMessage({
			type: "generate",
			noRecalc: true,
			highlights,
			dimColor,
			hideUnselected: hideUnselectedRef.current,
			backgroundColor,
			selectedColor,
			fontFamily,
		});
	};

	useEffect(() => {
		if (!hasGraph) return;
		const timer = setTimeout(() => {
			applySelection();
		}, 100);
		return () => clearTimeout(timer);
	}, [selectedNodes, hasGraph]);

	useEffect(() => {
		if (!hasGraph) return;
		const highlights = (selectedNodesRef.current || []).map((id) => ({
			id,
			color: selectedColor,
		}));
		console.log("[theme] repaint on theme change", {
			bg: backgroundColor,
			dim: dimColor,
			sel: selectedColor,
			font: fontFamily,
			highlights: highlights.length,
		});
		workerRef.current?.postMessage({
			type: "generate",
			noRecalc: true,
			highlights,
			dimColor,
			hideUnselected: hideUnselectedRef.current,
			backgroundColor,
			selectedColor,
			fontFamily,
		});
	}, [backgroundColor, dimColor, selectedColor, fontFamily, hasGraph]);

	const toggleSelect = (id) => {
		setSelectedNodes((prev) => {
			const exists = prev.includes(id);
			const next = exists ? prev.filter((x) => x !== id) : [...prev, id];
			return next;
		});
	};

	const toggleHideUnselected = () => {
		const newHide = !hideUnselectedRef.current;
		setHideUnselected(newHide);
		const highlights = (selectedNodesRef.current || []).map((id) => ({
			id,
			color: selectedColor,
		}));
		const spec = lastSpecRef.current;
		console.log("[kbar] toggle hide", {
			newHide,
			highlights: highlights.length,
			hasSpec: !!spec,
			bg: backgroundColor,
			dim: dimColor,
			sel: selectedColor,
			font: fontFamily,
		});
		if (spec) {
			setIsProcessing(true);
			workerRef.current?.postMessage({
				type: "generate",
				spec,
				highlights,
				dimColor,
				hideUnselected: newHide,
				backgroundColor,
				selectedColor,
				fontFamily,
			});
		}
	};

	const refreshSankey = () => {
		const spec = lastSpecRef.current;
		const highlights = (selectedNodesRef.current || []).map((id) => ({
			id,
			color: selectedColor,
		}));
		console.log("[kbar] refresh", {
			highlights: highlights.length,
			hasSpec: !!spec,
			bg: backgroundColor,
			dim: dimColor,
			sel: selectedColor,
			font: fontFamily,
		});
		if (spec) {
			setIsProcessing(true);
			workerRef.current?.postMessage({
				type: "generate",
				spec,
				highlights,
				dimColor,
				hideUnselected: hideUnselectedRef.current,
				backgroundColor,
				selectedColor,
				fontFamily,
			});
		}
	};

	const triggerFilePicker = () => {
		fileInputRef.current?.click();
	};

	const exportGraph = () => {
		/*	try {
			const graph = lastGraphRef.current;
			if (!graph) return;
			const blob = new Blob([JSON.stringify(graph, null, 2)], {
				type: "application/json",
			});
			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = "sankey_graph.json";
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(url);
		} catch (err) {
			console.error("Export failed:", err);
		}*/
	};

	const exportPng = (mode) => {
		try {
			if (mode === "raw") setExportUsePure(true);
			else if (mode === "compressed") setExportUsePure(false);
			if (graphRef.current && graphRef.current.downloadPng) {
				setTimeout(() => {
					graphRef.current.downloadPng();
				}, 0);
			}
		} catch (err) {
			console.error("PNG export failed:", err);
		}
	};

	const handleFileChange = async (e) => {
		const file = e.target.files && e.target.files[0];
		if (!file) return;
		try {
			const text = await file.text();
			const parsed = JSON.parse(text);
			setCutterRoot(parsed);
			setIsCutterOpen(true);
		} catch (err) {
			console.error("No se pudo procesar el archivo:", err);
		}
	};

	const loadExampleFromPublic = async (filePath) => {
		setIsLoadingExample(true);
		try {
			const base = import.meta.env.BASE_URL || "/";
			const url = `${base}${filePath.replace(/^\//, "")}`;
			const res = await fetch(url);
			if (!res.ok) throw new Error(`HTTP ${res.status}`);
			const parsed = await res.json();
			setCutterRoot(parsed);
			setIsCutterOpen(true);
		} catch (err) {
			console.error("No se pudo cargar el ejemplo desde /public:", err);
		} finally {
			setIsLoadingExample(false);
		}
	};

	const looksLikeOpenAPI = (x) => {
		if (!x || typeof x !== "object") return false;
		const hasPaths = x.paths && typeof x.paths === "object";
		const hasVersion =
			typeof x.openapi === "string" || typeof x.swagger === "string";
		const hasInfo = x.info && typeof x.info === "object";
		return hasPaths && (hasVersion || hasInfo);
	};

	const useSpecNow = (spec) => {
		setSelectedNodes([]);
		setHideUnselected(false);
		lastGraphRef.current = null;
		lastSpecRef.current = spec;
		setIsProcessing(true);
		workerRef.current?.postMessage({
			type: "generate",
			spec,
			highlights: [],
			dimColor,
			hideUnselected: false,
			backgroundColor,
			selectedColor,
			fontFamily,
		});
	};

	const onToggleExportPure = () => setExportUsePure((prev) => !prev);

	if (!hasGraph) {
		return (
			<React.Fragment>
				<input
					ref={fileInputRef}
					id="openapi-file"
					type="file"
					accept=".json,application/json"
					onChange={handleFileChange}
					className="hidden"
					aria-hidden="true"
					tabIndex={-1}
				/>

				<AppHeader />
				<ExampleOpenApiLinks
					onLoadFromPublic={loadExampleFromPublic}
					isLoading={isLoadingExample || isProcessing}
					onDropFiles={(files) =>
						handleFileChange({ target: { files } })
					}
				/>

				<SpecCutterModal
					isOpen={isCutterOpen}
					rootObject={cutterRoot}
					onCancel={() => setIsCutterOpen(false)}
					onConfirm={(spec) => {
						setIsCutterOpen(false);
						if (spec) useSpecNow(spec);
					}}
				/>
			</React.Fragment>
		);
	}

	return (
		<KBarRoot>
			<KBarActionsRegistrar
				nodes={kbarNodes}
				onToggleSelect={toggleSelect}
				onApplyHighlights={applySelection}
				onToggleHideUnselected={toggleHideUnselected}
				hideUnselected={hideUnselected}
				onRefresh={refreshSankey}
				onTriggerFilePicker={triggerFilePicker}
				onExportGraph={exportGraph}
				onExportPng={exportPng}
				onExportPure={onToggleExportPure}
			/>

			<AppHeader />

			<SankeyView ref={graphRef} containerRef={containerRef} />
		</KBarRoot>
	);
}
