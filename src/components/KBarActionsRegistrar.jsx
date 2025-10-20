import { atom, useRecoilState } from "recoil";
import {
	ArrowPathIcon,
	ArrowUpTrayIcon,
	MapPinIcon,
	PhotoIcon,
	TagIcon,
	BeakerIcon,
	AdjustmentsHorizontalIcon,
	ArrowDownTrayIcon,
} from "@heroicons/react/24/outline";

import { useKBar, useRegisterActions } from "kbar";
import { useMemo, useState } from "react";
import { exportUsePureAtom } from "../state/atoms.js";

export default function KBarActionsRegistrar({
	nodes,
	onToggleSelect,
	onApplyHighlights,
	onRefresh,
	onTriggerFilePicker,
	onExportGraph,
	onExportPng,
	onToggleHideUnselected,
	hideUnselected,
}) {
	const { searchQuery } = useKBar((state) => ({
		searchQuery: state.searchQuery,
	}));
	const { query } = useKBar();
	const [exportUsePure, setExportUsePure] = useRecoilState(exportUsePureAtom);

	const [history, setHistory] = useState(() => {
		try {
			const stored = JSON.parse(
				window.localStorage.getItem("searchHistory") || "[]"
			);
			return Array.isArray(stored) ? stored : [];
		} catch {
			return [];
		}
	});

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
				id: "action:export-png-raw",
				name: "Export PNG · Raw (1:1)",
				subtitle: "Original size. No resampling.",
				icon: (
					<PhotoIcon
						className="w-4 h-4 text-violet-600"
						aria-hidden="true"
					/>
				),
				section: "Actions",
				keywords: "export png raw 1:1 original unscaled lossless",
				perform: () => {
					setExportUsePure(true);
					onExportPng?.("raw");
					updateHistory(searchQuery);
					setTimeout(() => query.toggle(), 0);
				},
			},
			{
				id: "action:export-png-compressed",
				name: "Export PNG · Compressed",
				subtitle: "Resampled to avoid failures with large graphs.",
				icon: (
					<PhotoIcon
						className="w-4 h-4 text-emerald-600"
						aria-hidden="true"
					/>
				),
				section: "Actions",
				keywords:
					"export png compressed resampled smaller optimized fallback",
				perform: () => {
					setExportUsePure(false);
					onExportPng?.("compressed");
					updateHistory(searchQuery);
					setTimeout(() => query.toggle(), 0);
				},
			},
		];
	}, [onExportPng, searchQuery, query]);

	const nodeActions = useMemo(() => {
		const list = Array.isArray(nodes) ? nodes : [];
		const toLower = (v) =>
			typeof v === "string"
				? v.toLowerCase()
				: String(v ?? "").toLowerCase();
		const deriveKind = (n) => {
			if (typeof n?.type === "string" && n.type.toLowerCase() === "route")
				return "route";
			if (String(n?.id ?? "").startsWith("route::")) return "route";
			return "field";
		};
		return list.map((n) => {
			const labelSafe =
				typeof n?.name === "string" ? n.name : String(n?.id ?? "");
			const kindSafe = deriveKind(n);
			return {
				id: `node:${n.id}`,
				name: labelSafe,
				subtitle: kindSafe === "route" ? "ruta" : "campo",
				section: "Nodes",
				keywords: `${toLower(labelSafe)} ${toLower(n?.id)} ${kindSafe}`,
				icon:
					kindSafe === "route" ? (
						<MapPinIcon
							className="w-4 h-4 text-blue-600"
							aria-hidden="true"
						/>
					) : (
						<TagIcon
							className="w-4 h-4 text-amber-600"
							aria-hidden="true"
						/>
					),
				data: { kind: kindSafe, nodeId: n.id },
				perform: () => {
					onToggleSelect?.(n.id);
					onApplyHighlights?.();
					updateHistory(searchQuery);
				},
			};
		});
	}, [nodes, onToggleSelect, onApplyHighlights, searchQuery]);

	useRegisterActions(
		[...baseActions, ...nodeActions],
		[baseActions, nodeActions]
	);

	return null;
}
