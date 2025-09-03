import clsx from "clsx";
import React from "react";
import { useRecoilValue } from "recoil";
import { activePanelState, selectedNodeIdState } from "../state/atoms.js";
import FieldsPanelsContainer from "./panels/fieldsPanel/FieldsPanelsContainer.jsx";

export default function SidePanel({ paths, fields, nodes }) {
	const active = useRecoilValue(activePanelState);
	const selectedNodeId = useRecoilValue(selectedNodeIdState);

	let content = null;
	switch (active) {
		case "fields":
			content = <FieldsPanelsContainer />;
			break;

		default:
			content = null;
	}

	const isOpen = !!active;

	return (
		<aside
			role="dialog"
			aria-modal="true"
			className={clsx(
				"fixed z-50 bg-surface select-none",
				"top-[var(--app-header-h)] left-[var(--app-sidebar-w)] bottom-0",
				"w-80 max-w-[90vw] border-r overflow-auto",
				"transform transition-transform duration-300 will-change-transform",
				isOpen
					? "translate-x-0 pointer-events-auto"
					: "-translate-x-[calc(100%+var(--app-sidebar-w))] pointer-events-none"
			)}
		>
			{content}
		</aside>
	);
}
