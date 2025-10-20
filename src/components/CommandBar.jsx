import { CheckIcon } from "@heroicons/react/24/outline";
import clsx from "clsx";
import {
	KBarPortal,
	KBarPositioner,
	KBarSearch,
	useKBar,
	useMatches,
} from "kbar";
import React from "react";
import { useRecoilState, useRecoilValue, useSetRecoilState } from "recoil";
import { kbarFilterState, selectedNodesState } from "../state/atoms.js";
import CommandBarFooter from "./CommandBarFooter";
import interact from "interactjs";

const ResultItem = React.forwardRef(function ResultItemBase(
	{ item, onRowClick, onToggleNode, isSelected },
	ref
) {
	const isSection = typeof item === "string";
	if (isSection) {
		return (
			<div
				ref={ref}
				className={clsx(
					"px-2 py-1.5",
					"text-[10px] uppercase tracking-wide",
					"text-gray-500",
					"select-none"
				)}
			>
				{item}
			</div>
		);
	}

	const isNode = !!item?.data?.nodeId;
	const nodeId = item?.data?.nodeId;

	return (
		<div
			ref={ref}
			className={clsx(
				"flex items-center justify-between",
				"px-2 py-1.5 rounded-md cursor-pointer",
				"text-gray-800",
				"hover:bg-gray-100",
				"select-none"
			)}
			onClick={() => onRowClick(item)}
		>
			<div className={clsx("flex items-center min-w-0", "gap-1.5")}>
				{item.icon && (
					<span className={clsx("shrink-0", "w-3.5 h-3.5")}>
						{item.icon}
					</span>
				)}
				<div className="flex flex-col min-w-0">
					<span
						className={clsx(
							"flex items-center gap-1",
							"text-xs leading-5",
							"whitespace-normal break-words"
						)}
					>
						{item.name}
						{isNode && item.data?.kind && (
							<span
								className={clsx(
									"px-1 py-0.5 rounded-full text-[9px] uppercase",
									item.data.kind === "route"
										? "bg-blue-100 text-blue-800"
										: "bg-green-100 text-green-800"
								)}
							>
								{item.data.kind === "route" ? "route" : "field"}
							</span>
						)}
					</span>
				</div>
			</div>

			<div className={clsx("flex items-center", "gap-1.5")}>
				{isNode && (
					<button
						type="button"
						className={clsx(
							"w-3.5 h-3.5",
							"flex items-center justify-center",
							"rounded-[3px] border",
							isSelected
								? "border-blue-700 bg-blue-700 text-white"
								: "border-gray-300"
						)}
						onClick={(e) => {
							e.preventDefault();
							e.stopPropagation();
							onToggleNode(nodeId);
						}}
					>
						{isSelected && (
							<CheckIcon
								className={clsx("w-3 h-3", "text-white")}
							/>
						)}
					</button>
				)}
				{item.shortcut?.length > 0 && (
					<div className={clsx("flex", "gap-1")}>
						{item.shortcut.map((sc) => (
							<kbd
								key={sc}
								className={clsx(
									"px-1 py-0.5",
									"text-[9px]",
									"bg-gray-100 border border-gray-300 rounded"
								)}
							>
								{sc}
							</kbd>
						))}
					</div>
				)}
			</div>
		</div>
	);
});

function Toolbar({ onDeselectAll }) {
	const [filters, setFilters] = useRecoilState(kbarFilterState);

	return (
		<div
			className={clsx(
				"flex items-center justify-between",
				"px-2.5 py-1.5",
				"border-b border-gray-200",
				"select-none"
			)}
		>
			<div className={clsx("flex", "gap-1.5")}>
				{["All", "Routes", "Fields"].map((label) => {
					const active = filters.tab === label;
					return (
						<button
							key={label}
							type="button"
							onClick={() => {
								console.log("[Toolbar] set tab:", label);
								setFilters((s) => ({ ...s, tab: label }));
							}}
							className={clsx(
								"h-7 px-2.5 rounded-full text-xs border",
								active
									? "bg-gray-900 text-white border-gray-900"
									: "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
							)}
						>
							{label}
						</button>
					);
				})}
			</div>
			<div className={clsx("flex items-center", "gap-1.5")}>
				<button
					type="button"
					onClick={() => {
						console.log("[Toolbar] Deselect all");
						onDeselectAll();
					}}
					className={clsx(
						"h-7 px-2.5",
						"rounded-md text-xs",
						"border bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
					)}
				>
					Deselect all
				</button>
			</div>
		</div>
	);
}

export default function CommandBar() {
	const { results } = useMatches();
	const { query } = useKBar();

	const selectedNodes = useRecoilValue(selectedNodesState);
	const setSelectedNodes = useSetRecoilState(selectedNodesState);

	const dragRef = React.useRef(null);
	const dragHandleRef = React.useRef(null);
	const interactInstanceRef = React.useRef(null);
	const dragPositionRef = React.useRef({ x: 0, y: 0 });

	const [dragEl, setDragEl] = React.useState(null);
	const [dragHandleEl, setDragHandleEl] = React.useState(null);

	React.useEffect(() => {
		console.log("[CommandBar] mounted");
		return () => console.log("[CommandBar] unmounted");
	}, []);

	React.useEffect(() => {
		if (!dragEl || !dragHandleEl) return;

		const position = dragPositionRef.current;

		function viewportRestriction() {
			return {
				left: 0,
				top: 0,
				right: window.innerWidth,
				bottom: window.innerHeight,
			};
		}

		try {
			if (interactInstanceRef.current) {
				interactInstanceRef.current.unset();
				interactInstanceRef.current = null;
				console.log("[Drag] previous instance unset");
			}
		} catch (e) {
			console.warn("[Drag] unset error", e);
		}

		dragEl.style.transform = `translate(${position.x}px, ${position.y}px)`;

		interactInstanceRef.current = interact(dragEl).draggable({
			listeners: {
				start() {
					console.log("[Drag] start");
					dragHandleEl.classList.add("cursor-grabbing");
					dragHandleEl.classList.remove("cursor-grab");
				},
				move(event) {
					position.x += event.dx;
					position.y += event.dy;
					dragEl.style.transform = `translate(${position.x}px, ${position.y}px)`;
				},
				end() {
					console.log("[Drag] end at", position);
					dragHandleEl.classList.remove("cursor-grabbing");
					dragHandleEl.classList.add("cursor-grab");
				},
			},
			modifiers: [
				interact.modifiers.restrictRect({
					restriction: viewportRestriction,
					endOnly: true,
				}),
			],
			allowFrom: ".drag-handle",
			ignoreFrom: "input, textarea, select, button, kbd",
		});

		function handleResize() {
			const bounds = viewportRestriction();
			const x = Math.min(
				Math.max(position.x, bounds.left - window.innerWidth),
				bounds.right
			);
			const y = Math.min(
				Math.max(position.y, bounds.top - window.innerHeight),
				bounds.bottom
			);
			position.x = x;
			position.y = y;
			if (dragEl)
				dragEl.style.transform = `translate(${position.x}px, ${position.y}px)`;
			console.log("[Drag] resize clamp", position);
		}

		window.addEventListener("resize", handleResize);

		console.log("[Drag] initialized");

		return () => {
			try {
				interactInstanceRef.current &&
					interactInstanceRef.current.unset();
				console.log("[Drag] cleanup");
			} catch (e) {
				console.warn("[Drag] cleanup error", e);
			}
			window.removeEventListener("resize", handleResize);
		};
	}, [dragEl, dragHandleEl]);

	const toggleNode = (nodeId) => {
		console.log("[CommandBar] toggleNode:", nodeId);
		setSelectedNodes((prev) =>
			prev.includes(nodeId)
				? prev.filter((id) => id !== nodeId)
				: [...prev, nodeId]
		);
	};

	const handleRowClick = (item) => {
		if (typeof item === "string") return;
		const isNode = !!item?.data?.nodeId;
		if (isNode) {
			console.log("[CommandBar] click node:", item.data.nodeId);
			toggleNode(item.data.nodeId);
			return;
		}
		const isFn = item.id?.startsWith?.("action:");
		if (isFn) {
			console.log("[CommandBar] run action:", item.id);
			item.perform();
			query.toggle();
		} else {
			console.log("[CommandBar] click item (no-op):", item.id);
		}
	};

	return (
		<KBarPortal>
			<KBarPositioner
				className={clsx(
					"fixed inset-0 z-[1000]",
					"flex items-start justify-center",
					"pt-[5vh] px-3",
					"pointer-events-none"
				)}
			>
				<div
					ref={(el) => {
						dragRef.current = el;
						setDragEl(el);
					}}
					className={clsx(
						"w-full min-w-[280px] max-w-[560px] sm:max-w-[600px]",
						"overflow-hidden rounded-md",
						"border border-gray-200",
						"bg-surface text-gray-900",
						"shadow-xl",
						"pointer-events-auto",
						"will-change-transform"
					)}
				>
					<div className={clsx("border-b border-gray-200")}>
						<div className={clsx("flex items-center")}>
							<div
								ref={(el) => {
									dragHandleRef.current = el;
									setDragHandleEl(el);
								}}
								className={clsx(
									"drag-handle",
									"cursor-grab",
									"h-8 w-8 flex items-center justify-center select-none"
								)}
								aria-label="Drag"
								title="Drag"
							>
								<span
									className={clsx(
										"text-gray-400 text-lg leading-none"
									)}
								>
									⋮⋮
								</span>
							</div>
							<div className={clsx("flex-1")}>
								<KBarSearch
									placeholder="Search nodes or run a command…"
									className={clsx(
										"w-full bg-transparent",
										"px-2.5 py-1.5",
										"text-xs text-gray-900 placeholder-gray-400",
										"focus:outline-none"
									)}
									onFocus={() =>
										console.log("[Search] focus")
									}
									onChange={(e) =>
										console.log(
											"[Search] change:",
											e.target.value
										)
									}
								/>
							</div>
						</div>
					</div>

					<Toolbar onDeselectAll={() => setSelectedNodes([])} />

					<div
						className={clsx(
							"max-h-[50vh]",
							"overflow-y-auto",
							"select-none"
						)}
					>
						{results.length === 0 ? (
							<div
								className={clsx(
									"px-2.5 py-5",
									"text-center text-xs text-gray-500"
								)}
							>
								No results.
							</div>
						) : (
							results.map((item, idx) => {
								const isNode =
									typeof item !== "string" &&
									!!item?.data?.nodeId;
								const nodeId = isNode
									? item.data.nodeId
									: undefined;
								const isSelected =
									isNode && nodeId
										? selectedNodes.includes(nodeId)
										: false;
								return (
									<ResultItem
										key={
											typeof item === "string"
												? `section-${idx}`
												: item.id || idx
										}
										item={item}
										onRowClick={handleRowClick}
										onToggleNode={toggleNode}
										isSelected={isSelected}
									/>
								);
							})
						)}
					</div>

					<CommandBarFooter />
				</div>
			</KBarPositioner>
		</KBarPortal>
	);
}
