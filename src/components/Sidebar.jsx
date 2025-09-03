import { InformationCircleIcon, TagIcon } from "@heroicons/react/24/outline";
import clsx from "clsx";
import React from "react";
import { useRecoilState, useRecoilValue } from "recoil";
import {
	activePanelState,
	selectedFieldsState,
	selectedPathsState,
} from "../state/atoms.js";
import Badge from "./Badge.jsx";

export default function Sidebar() {
	const [active, setActive] = useRecoilState(activePanelState);
	const selPaths = useRecoilValue(selectedPathsState);
	const selFields = useRecoilValue(selectedFieldsState);

	const defs = {
		info: { id: "info", Icon: InformationCircleIcon, title: "Info" },
		fields: {
			id: "fields",
			Icon: TagIcon,
			title: "Campos",
			badge: selFields?.size ?? 0,
		},
	};
	const top = ["info", "fields"]; //, "load", "paths", "fields", "search", "selected",, "controls",
	const bottom = [];

	const toggle = (id) => setActive(active === id ? null : id);

	const Button = (p) => {
		const isActive = active === p.id;
		return (
			<button
				key={p.id}
				onClick={() => toggle(p.id)}
				title={p.title}
				className={clsx("relative btn-icon")}
				data-active={isActive ? "true" : undefined}
			>
				<p.Icon className="w-5 h-5 pointer-events-none" />
				<Badge value={p.badge} />
			</button>
		);
	};

	return (
		<aside
			className={clsx(
				"sidebar",
				"fixed z-40 left-0 bottom-0",
				"top-[var(--app-header-h)]",
				"w-[var(--app-sidebar-w)] text-fore flex flex-col items-center",
				"border-r select-none bg-panel"
			)}
		>
			{top.map((id) => Button(defs[id]))}
			<div className="flex-1" />
			{bottom.map(Button)}
		</aside>
	);
}
