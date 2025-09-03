import { RectangleGroupIcon } from "@heroicons/react/24/outline";
import { useKBar, useRegisterActions } from "kbar";
import React, { useEffect, useMemo, useState } from "react";
import { useRecoilState, useSetRecoilState } from "recoil";
import { selectedNodeIdState, selectedNodesState } from "../state/atoms.js";

export default function KBarActionsRegistrar({ nodes, containerRef }) {
	const setSelectedNodeId = useSetRecoilState(selectedNodeIdState);

	const [selectedNodes, setSelectedNodes] =
		useRecoilState(selectedNodesState);

	const { searchQuery } = useKBar((state) => ({
		searchQuery: state.searchQuery,
	}));

	const [history, setHistory] = useState([]);

	useEffect(() => {
		try {
			const stored = JSON.parse(
				window.localStorage.getItem("searchHistory") || "[]"
			);
			if (Array.isArray(stored)) setHistory(stored);
		} catch {}
	}, []);

	function updateHistory(term) {
		const t = (term || "").trim();
		if (!t) return;
		const next = [t, ...history.filter((h) => h !== t)].slice(0, 10);
		setHistory(next);
		try {
			window.localStorage.setItem("searchHistory", JSON.stringify(next));
		} catch {}
	}

	const baseActions = useMemo(() => {
		return [
			{
				id: "layout.fa2",
				name: "Layout: ForceAtlas2",
				section: "Layouts",
				icon: <RectangleGroupIcon className="w-4 h-4" />,
				perform: () => {
					console.log("layout.fa2");
				},
			},
		];
	}, []);

	const viewActions = useMemo(() => {
		return [
			{
				id: "hud.toggle",
				name: "Controles del grafo: mostrar/ocultar",
				section: "Grafo · Vista",
				perform: () => {
					console.log("Controles del grafo: mostrar/ocultar");
				},
			},
		];
	}, []);

	const nodeActions = useMemo(() => {
		const list = Array.isArray(nodes) ? nodes : [];
		return list.map((n) => ({
			id: `node:${n.id}`,
			name: n.label || n.id,
			subtitle: n.kind === "route" ? "ruta" : "campo",
			section: "Nodos",
			keywords: `${(n.label || "").toLowerCase()} ${String(
				n.id
			).toLowerCase()} ${n.kind}`,
			data: {
				kind: "node",
				nodeId: n.id,
				icon: n.kind === "route" ? "route" : "field",
			},
			perform: () => {
				const next = new Set(selectedNodes);
				if (next.has(n.id)) next.delete(n.id);
				else next.add(n.id);
				setSelectedNodes(next);
				setSelectedNodeId(n.id);
				try {
					if (window.__focusNode) window.__focusNode(n.id);
				} catch {}
				updateHistory(searchQuery);
			},
		}));
	}, [
		nodes,
		selectedNodes,
		setSelectedNodeId,
		setSelectedNodes,
		searchQuery,
	]);

	useRegisterActions(
		[...baseActions, ...viewActions, ...nodeActions],
		[baseActions, viewActions, nodeActions]
	);

	return null;
}
