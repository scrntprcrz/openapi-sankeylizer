import interact from "interactjs";
import React, { useEffect, useRef } from "react";
import FieldsPanel from "./FieldsPanel.jsx";

export default function FieldsPanelsContainer({ fields }) {
	const multi = true;
	const containerRef = useRef(null);

	useEffect(() => {
		const el = containerRef.current;
		if (!el) return;

		try {
			interact(".fp-resize-handle").unset();
		} catch {}
		if (!multi) return;

		const MIN = 20;
		const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

		interact(".fp-resize-handle").draggable({
			lockAxis: "y",
			listeners: {
				move(evt) {
					const idx = Number(evt.target.getAttribute("data-index"));
					const prev = el.querySelector(
						`.fp-slot[data-index="${idx}"]`
					);
					const next = el.querySelector(
						`.fp-slot[data-index="${idx + 1}"]`
					);
					if (!prev || !next) return;

					const rect = el.getBoundingClientRect();
					const deltaPct = (evt.dy / rect.height) * 100;

					const pb = parseFloat(prev.style.flexBasis) || 50;
					const nb = parseFloat(next.style.flexBasis) || 50;
					const total = pb + nb;

					const newPrev = clamp(pb + deltaPct, MIN, total - MIN);
					const newNext = total - newPrev;

					prev.style.flexBasis = `${newPrev}%`;
					next.style.flexBasis = `${newNext}%`;
				},
			},
			cursorChecker: () => "row-resize",
		});

		return () => {
			try {
				interact(".fp-resize-handle").unset();
			} catch {}
		};
	}, []);

	return (
		<div ref={containerRef} className="h-full min-h-0 flex flex-col">
			<div
				className="fp-slot relative flex flex-col min-h-[20%]"
				data-index={0}
				style={{ flexBasis: multi ? "50%" : "100%" }}
			>
				<FieldsPanel />
				<div
					className="fp-resize-handle absolute -bottom-[1px] left-0 right-0 h-1 cursor-row-resize select-none  bg-transparent hover:bg-accent "
					data-index={0}
					title="Arrastrar para redimensionar"
				></div>
			</div>

			<div
				className="fp-slot relative flex flex-col min-h-[20%]"
				data-index={1}
				style={{ flexBasis: "50%" }}
			>
				<FieldsPanel />
			</div>
		</div>
	);
}
