import { ArrowUpTrayIcon } from "@heroicons/react/24/outline";
import React, { useEffect, useRef, useState } from "react";
import { useSetRecoilState } from "recoil";
import AppHeader from "./components/AppHeader.jsx";
import ExampleOpenApiLinks from "./components/ExampleOpenApiLinks.jsx";
import KBarActionsRegistrar from "./components/KBarActionsRegistrar.jsx";
import SankeyView from "./components/SankeyView.jsx";
import KBarRoot from "./providers/KBarRoot.jsx";
import { customRequestGraphState, graphTypeState } from "./state/atoms.js";

export default function App() {
	const containerRef = useRef(null);

	const workerRef = useRef(null);
	const [hasGraph, setHasGraph] = useState(false);
	const [isLoadingExample, setIsLoadingExample] = useState(false);
	const setGraphType = useSetRecoilState(graphTypeState);
	const setCustomRequestGraph = useSetRecoilState(customRequestGraphState);

	useEffect(() => {
		const worker = new Worker(new URL("./worker.js", import.meta.url), {
			type: "module",
		});
		worker.onmessage = (event) => {
			const { type, graph, message } = event.data || {};
			if (type === "graph" && graph) {
				setCustomRequestGraph(graph);
				setGraphType("request");
				setHasGraph(true);
			} else if (type === "error") {
				console.error("Error generando el grafo:", message);
			}
		};
		workerRef.current = worker;
		return () => {
			worker.terminate();
		};
	}, [setCustomRequestGraph, setGraphType]);

	const handleFileChange = async (e) => {
		const file = e.target.files && e.target.files[0];
		if (!file) return;
		try {
			const text = await file.text();
			const spec = JSON.parse(text);

			workerRef.current?.postMessage({ type: "generate", spec });
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
			const spec = await res.json();
			workerRef.current?.postMessage({ type: "generate", spec });
		} catch (err) {
			console.error("No se pudo cargar el ejemplo desde /public:", err);
		} finally {
			setIsLoadingExample(false);
		}
	};

	return (
		<KBarRoot>
			<KBarActionsRegistrar nodes={[]} containerRef={containerRef} />

			<AppHeader
				rightSlot={
					hasGraph && (
						<label
							htmlFor="openapi-file"
							className="inline-flex items-center h-8 px-3 rounded-md text-sm font-medium bg-accent text-for-accent hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent shadow-sm cursor-pointer select-none"
						>
							<ArrowUpTrayIcon
								className="w-5 h-5 mr-2 opacity-90"
								aria-hidden="true"
							/>
							<span>Upload OpenAPI file</span>
						</label>
					)
				}
			/>

			<input
				id="openapi-file"
				type="file"
				accept=".json,application/json"
				onChange={handleFileChange}
				className="hidden"
				aria-hidden="true"
				tabIndex={-1}
			/>

			{!hasGraph ? (
				<div
					className="fixed inset-0 z-0"
					style={{
						top: "var(--app-header-h)",

						bottom: 0,
					}}
				>
					<div className="text-center w-full h-full flex items-center justify-center flex-col">
						<p className="text-2xl sm:text-3xl font-semibold text-fore/90">
							Upload an OpenAPI (.json) file to generate the
							Sankey diagram.
						</p>
						{isLoadingExample && (
							<p className="mt-4 text-sm text-fore/70">
								Loading example…
							</p>
						)}
						<div className="mt-6">
							<label
								htmlFor="openapi-file"
								className="inline-flex items-center h-10 px-4 rounded-md text-sm font-medium bg-accent text-for-accent hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent shadow-sm cursor-pointer select-none"
							>
								<ArrowUpTrayIcon
									className="w-5 h-5 mr-2 opacity-90"
									aria-hidden="true"
								/>
								<span>Upload OpenAPI file</span>
							</label>
							<p className="mt-3 text-xs text-fore/60">
								Only .json with a valid OpenAPI spec (v3.x).
							</p>
						</div>
						<ExampleOpenApiLinks
							className="text-left"
							onLoadFromPublic={loadExampleFromPublic}
							isLoading={isLoadingExample}
						/>
					</div>
				</div>
			) : (
				<SankeyView containerRef={containerRef} />
			)}
		</KBarRoot>
	);
}
