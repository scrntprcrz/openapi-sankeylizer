import React, { useEffect, useMemo, useState } from "react";
import PathSelectorPanel from "./PathSelectorPanel.jsx";
import { ArrowTurnUpLeftIcon } from "@heroicons/react/24/outline";
import { HomeIcon, ChevronRightIcon } from "@heroicons/react/24/solid";
import { StarIcon as OpenApiIcon } from "@heroicons/react/24/solid";

function isLikelyOpenAPISpec(x) {
	if (!x || typeof x !== "object") return false;
	const hasPaths = x.paths && typeof x.paths === "object";
	const hasVersion =
		typeof x.openapi === "string" || typeof x.swagger === "string";
	const hasInfo = x.info && typeof x.info === "object";
	return hasPaths && (hasVersion || hasInfo);
}

function scanCandidates(root, maxDepth = 6) {
	const out = [];
	const queue = [{ node: root, path: [] }];
	const seen = new WeakSet();
	while (queue.length) {
		const { node, path } = queue.shift();
		if (
			!node ||
			typeof node !== "object" ||
			seen.has(node) ||
			path.length > maxDepth
		)
			continue;
		seen.add(node);
		if (isLikelyOpenAPISpec(node)) out.push({ node, path });
		for (const [k, v] of Object.entries(node)) {
			if (v && typeof v === "object")
				queue.push({ node: v, path: [...path, k] });
		}
	}
	return out;
}

export default function SpecCutterModal({
	isOpen,
	rootObject,
	onCancel,
	onConfirm,
	defaultDownloadName = "openapi_extracted.json",
}) {
	const [currentPath, setCurrentPath] = useState([]);
	const [selectedPaths, setSelectedPaths] = useState([]);

	const currentNode = useMemo(() => {
		return currentPath.reduce(
			(acc, key) =>
				acc && typeof acc === "object" ? acc[key] : undefined,
			rootObject
		);
	}, [rootObject, currentPath]);

	const keys = useMemo(() => {
		if (!currentNode || typeof currentNode !== "object") return [];
		return Object.keys(currentNode).filter(
			(k) => typeof currentNode[k] === "object"
		);
	}, [currentNode]);

	const isValid = useMemo(
		() => isLikelyOpenAPISpec(currentNode),
		[currentNode]
	);
	const candidates = useMemo(() => scanCandidates(rootObject), [rootObject]);

	const crumbs = useMemo(() => {
		const base = [{ label: "Root", path: [] }];
		const rest = currentPath.map((k, i) => ({
			label: k,
			path: currentPath.slice(0, i + 1),
		}));
		return [...base, ...rest];
	}, [currentPath]);

	useEffect(() => {
		if (!isOpen) setCurrentPath([]);
	}, [isOpen]);

	useEffect(() => {
		if (isValid) {
			const all = Object.keys(currentNode.paths || {});
			setSelectedPaths(all);
		} else {
			setSelectedPaths([]);
		}
	}, [isValid, currentNode]);

	if (!isOpen) return null;

	const goTo = (key) => setCurrentPath((p) => [...p, key]);
	const back = () => setCurrentPath((p) => p.slice(0, -1));
	const goToPath = (path) => setCurrentPath(path);

	const buildFilteredSpec = () => {
		if (!isValid) return currentNode;
		const out = { ...currentNode, paths: {} };
		for (const k of selectedPaths) {
			if (currentNode.paths && currentNode.paths[k])
				out.paths[k] = currentNode.paths[k];
		}
		return out;
	};

	const pickBestCandidate = (list) => {
		if (!Array.isArray(list) || list.length === 0) return null;
		const scored = list.map((c) => {
			const pathsCount =
				c?.node?.paths && typeof c.node.paths === "object"
					? Object.keys(c.node.paths).length
					: 0;
			const hasOpenapi = typeof c?.node?.openapi === "string" ? 1 : 0;
			const hasSwagger = typeof c?.node?.swagger === "string" ? 1 : 0;
			const depth = c.path.length;
			const score =
				pathsCount * 100 + hasOpenapi * 10 + hasSwagger * 5 - depth;
			return { item: c, score };
		});
		scored.sort((a, b) => b.score - a.score);
		return scored[0].item;
	};

	const goToBestCandidate = () => {
		const best = pickBestCandidate(candidates);
		if (best) goToPath(best.path);
	};

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center">
			<div className="absolute inset-0 bg-black/40" onClick={onCancel} />
			<div className="relative w-full max-w-5xl max-h-[85vh] bg-white rounded-lg shadow-lg overflow-hidden">
				<header className="px-5 py-3 border-b flex items-center justify-between">
					<h2 className="text-base font-semibold">
						OpenAPI from JSON
					</h2>
				</header>

				<div className="grid grid-cols-12 gap-0">
					<aside className="col-span-4 border-r h-[65vh]">
						<div className="h-full flex flex-col min-h-0 gap-0">
							<div className="flex flex-col">
								<div className="flex items-center justify-between bg-gray-100  px-3 py-2">
									<div className="flex items-center gap-2">
										<span className="text-xs text-gray-700">
											Keys
										</span>
									</div>

									<div className="flex items-center gap-1">
										<button
											type="button"
											onClick={back}
											disabled={!currentPath.length}
											className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-gray-100 hover:bg-gray-200 disabled:opacity-50"
										>
											<ArrowTurnUpLeftIcon className="w-4 h-4" />
										</button>
									</div>
								</div>
								<ul className="max-h-40 overflow-auto">
									{keys.length === 0 && (
										<li className="text-sm text-gray-400 px-3 h-7 flex items-center">
											No more sub-nodes
										</li>
									)}
									{keys.map((k) => {
										const node = currentNode?.[k];
										const isOpenAPI =
											isLikelyOpenAPISpec(node);
										return (
											<li key={k} className="h-7">
												<button
													type="button"
													onClick={() => goTo(k)}
													className="w-full h-7 px-3 hover:bg-gray-50 text-sm flex items-center justify-between gap-2"
												>
													<span
														className={`text-left truncate ${
															isOpenAPI
																? "font-semibold"
																: "font-normal"
														}`}
														title={k}
													>
														{k}
													</span>

													{isOpenAPI && (
														<OpenApiIcon
															className="w-4 h-4 text-yellow-500 shrink-0"
															aria-label="Esquema OpenAPI"
															title="Esquema OpenAPI"
														/>
													)}
												</button>
											</li>
										);
									})}
								</ul>
							</div>

							<div className="flex-1 min-h-0">
								<PathSelectorPanel
									className="h-full"
									paths={
										isValid ? currentNode.paths || {} : {}
									}
									onChange={(keys) => setSelectedPaths(keys)}
								/>
							</div>
						</div>
					</aside>

					<main className="col-span-8 h-[65vh] overflow-auto">
						<div className="sticky top-0 z-10 border-b bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/70">
							<nav
								aria-label="Ruta"
								className="w-full px-3 py-1.5"
							>
								<ol
									role="list"
									className="flex items-center gap-1.5 text-sm"
								>
									{crumbs.map((c, i) => {
										const isLast = i === crumbs.length - 1;
										return (
											<li
												key={i}
												className="flex items-center shrink-0"
											>
												{i > 0 && (
													<ChevronRightIcon
														className="w-4 h-4 text-gray-300 mx-1"
														aria-hidden="true"
													/>
												)}
												<button
													type="button"
													onClick={() =>
														goToPath(c.path)
													}
													aria-current={
														isLast
															? "page"
															: undefined
													}
													title={
														i === 0
															? "Inicio"
															: c.label
													}
													className={[
														"inline-flex items-center gap-1.5 rounded",
														isLast
															? "text-gray-900 font-semibold"
															: "text-gray-500 hover:text-gray-700",
														"focus:outline-none focus:ring-2 focus:ring-gray-300",
													].join(" ")}
												>
													{i === 0 ? (
														<>
															<HomeIcon
																className="w-4 h-4 text-gray-400"
																aria-hidden="true"
															/>
															<span className="sr-only">
																Root
															</span>
														</>
													) : (
														<span className="truncate max-w-[16rem]">
															{c.label}
														</span>
													)}
												</button>
											</li>
										);
									})}
								</ol>
							</nav>
						</div>

						<div>
							<pre className="text-xs leading-5 bg-gray-50  overflow-auto">
								{JSON.stringify(
									isValid ? buildFilteredSpec() : currentNode,
									null,
									2
								)}
							</pre>
						</div>
					</main>
				</div>

				<footer className="px-3 py-3 border-t flex items-center justify-between">
					<div className="">
						<button
							type="button"
							onClick={goToBestCandidate}
							className="inline-flex items-center px-3 h-9 rounded-md text-sm bg-accent text-for-accent hover:opacity-90 disabled:opacity-50"
						>
							Go to Detected Schema
						</button>
					</div>
					<div className="flex items-center gap-2">
						{/*
						<button
							type="button"
							onClick={downloadSelection}
							disabled={!isValid || selectedPaths.length === 0}
							className="inline-flex items-center px-3 h-9 rounded-md text-sm bg-accent text-for-accent hover:opacity-90 disabled:opacity-50"
						>
							Download
						</button>

            */}

						<button
							type="button"
							onClick={() => onConfirm?.(buildFilteredSpec())}
							disabled={!isValid || selectedPaths.length === 0}
							className="inline-flex items-center px-3 h-9 rounded-md text-sm bg-accent text-for-accent hover:opacity-90 disabled:opacity-50"
							title="Usar"
						>
							Use
						</button>

						<button
							type="button"
							onClick={onCancel}
							className="inline-flex items-center px-3 h-9 rounded-md text-sm border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
						>
							Cancel
						</button>
					</div>
				</footer>
			</div>
		</div>
	);
}
