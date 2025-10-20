import { Menu, Portal, Transition } from "@headlessui/react";
import {
	ArrowDownTrayIcon,
	ArrowPathIcon,
	CheckCircleIcon,
	CheckIcon,
	ChevronDownIcon,
} from "@heroicons/react/24/outline";
import clsx from "clsx";
import {
	Fragment,
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { useRecoilState } from "recoil";
import GOOGLE_FONTS from "../lostAndFounds/gfonts";
import {
	backgroundColorAtom,
	dimColorAtom,
	selectedColorAtom,
	selectedFontAtom,
	textColorAtom,
} from "../state/atoms";

const SYSTEM_FONTS = [
	{
		label: "System UI",
		cssFamily:
			'system-ui, -apple-system, "Segoe UI", Roboto, Ubuntu, Cantarell, "Noto Sans", "Helvetica Neue", Arial, sans-serif',
	},
	{
		label: "Serif",
		cssFamily:
			'ui-serif, Georgia, Cambria, "Times New Roman", Times, serif',
	},
	{
		label: "Mono",
		cssFamily:
			'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
	},
];

export default function CommandBarFooter() {
	const [backgroundColor, setBackgroundColor] =
		useRecoilState(backgroundColorAtom);
	const [selectedColor, setSelectedColor] = useRecoilState(selectedColorAtom);
	const [dimColor, setDimColor] = useRecoilState(dimColorAtom);
	const [selectedFont, setSelectedFont] = useRecoilState(selectedFontAtom);
	const [textColor, setTextColor] = useRecoilState(textColorAtom);

	const [draftBg, setDraftBg] = useState(backgroundColor);
	const [draftSel, setDraftSel] = useState(selectedColor);
	const [draftDim, setDraftDim] = useState(dimColor);
	const [draftTxt, setDraftTxt] = useState(textColor);

	useEffect(() => {
		setDraftBg(backgroundColor);
		setDraftSel(selectedColor);
		setDraftDim(dimColor);
		setDraftTxt(textColor);
		document.body.style.backgroundColor = backgroundColor;
	}, [backgroundColor, selectedColor, dimColor, textColor]);

	const applyTheme = ({ bg, sel, dim, txt }) => {
		setBackgroundColor(bg);
		setSelectedColor(sel);
		setDimColor(dim);
		setTextColor(txt);
	};

	const cancelDrafts = () => {
		setDraftBg(backgroundColor);
		setDraftSel(selectedColor);
		setDraftDim(dimColor);
		setDraftTxt(textColor);
	};

	return (
		<div className="w-full">
			<div className="mx-auto flex w-full items-center justify-between gap-4 px-3 py-2 text-sm border-t border-gray-200 select-none">
				<div className="flex items-center gap-4">
					<ThemeMenu
						bg={draftBg}
						sel={draftSel}
						dim={draftDim}
						txt={draftTxt}
						onChangeBg={setDraftBg}
						onChangeSel={setDraftSel}
						onChangeDim={setDraftDim}
						onChangeTxt={setDraftTxt}
						onApply={() =>
							applyTheme({
								bg: draftBg,
								sel: draftSel,
								dim: draftDim,
								txt: draftTxt,
							})
						}
						onCancel={cancelDrafts}
					/>

					<label className="flex items-center gap-2 text-neutral-600 select-none">
						<span>Font label</span>
						<FontMenu
							value={selectedFont}
							onChange={setSelectedFont}
						/>
					</label>
				</div>

				<div className="inline-flex items-center gap-1 px-2 py-1 text-xs text-muted select-none">
					<span>Press</span>
					<kbd className="inline-flex items-center justify-center rounded border bg-background px-1.5 leading-6">
						esc
					</kbd>
					<span>to close</span>
				</div>
			</div>
		</div>
	);
}

function ThemeMenu({
	bg,
	sel,
	dim,
	txt,
	onChangeBg,
	onChangeSel,
	onChangeDim,
	onChangeTxt,
	onApply,
	onCancel,
}) {
	const btnRef = useRef(null);
	const [pos, setPos] = useState({ top: 0, left: 0 });

	useLayoutEffect(() => {
		const update = () => {
			const r = btnRef.current?.getBoundingClientRect();
			if (!r) return;
			setPos({ top: r.top, left: r.left });
		};
		update();
		window.addEventListener("resize", update);
		window.addEventListener("scroll", update, true);
		return () => {
			window.removeEventListener("resize", update);
			window.removeEventListener("scroll", update, true);
		};
	}, []);

	return (
		<Menu as="div" className="relative inline-block text-left select-none">
			<Menu.Button
				ref={btnRef}
				className={clsx(
					"inline-flex items-center gap-2 px-2 py-1 leading-none",
					"text-neutral-700 hover:text-neutral-900 rounded-md border",
					"border-neutral-300 bg-transparent shadow-sm",
					"focus:outline-none focus:ring-2 focus:ring-black/10",
					"select-none"
				)}
				onClick={() => console.log("[theme] open")}
			>
				<span>Colors</span>
				<div className="flex items-center gap-1">
					<SwatchDot color={bg} />
					<SwatchDot color={sel} />
					<SwatchDot color={dim} />
					<SwatchDot color={txt} />
				</div>
				<ChevronDownIcon className="h-4 w-4" aria-hidden="true" />
			</Menu.Button>

			<Portal>
				<Transition
					as={Fragment}
					enter="transition ease-out duration-100"
					enterFrom="transform opacity-0 scale-95"
					enterTo="transform opacity-100 scale-100"
					leave="transition ease-in duration-75"
					leaveFrom="transform opacity-100 scale-100"
					leaveTo="transform opacity-0 scale-95"
				>
					<Menu.Items
						className={clsx(
							"fixed z-[1200] min-w-[24rem] p-4 rounded-xl border shadow-xl origin-bottom-left",
							"border-neutral-200 bg-white select-none overflow-hidden"
						)}
						style={{
							left: pos.left,
							top: pos.top,
							transform: "translateY(-8px) translateY(-100%)",
						}}
					>
						<style>{`
							.color-input { appearance: none; border: 0; padding: 0; background: transparent; }
							.color-input::-webkit-color-swatch-wrapper { padding: 0; }
							.color-input::-webkit-color-swatch { border: none; }
							.color-input::-moz-color-swatch { border: none; }
						`}</style>
						<div className="grid grid-cols-[1fr,auto] items-start gap-y-3 gap-x-3">
							<div>
								<div className="text-sm font-medium text-neutral-800">
									Canvas background
								</div>
								<div className="text-xs text-neutral-500">
									Affects contrast & export
								</div>
								<div className="mt-0.5 text-xs text-neutral-700">
									{bg}
								</div>
							</div>

							<span className="inline-flex rounded-lg ring-1 ring-gray-300 shadow-sm p-0.5 hover:ring-gray-400 focus-within:ring-gray-500 transition">
								<input
									type="color"
									value={bg}
									onChange={(e) => onChangeBg(e.target.value)}
									className="color-input block h-9 w-12 cursor-pointer rounded-md border-0 overflow-hidden focus-visible:outline-none"
								/>
							</span>

							<div>
								<div className="text-sm font-medium text-neutral-800">
									Text color
								</div>
								<div className="text-xs text-neutral-500">
									For labels & nodes
								</div>
								<div className="mt-0.5 text-xs text-neutral-700">
									{txt}
								</div>
							</div>

							<span className="inline-flex rounded-lg ring-1 ring-gray-300 shadow-sm p-0.5 hover:ring-gray-400 focus-within:ring-gray-500 transition">
								<input
									type="color"
									value={txt}
									onChange={(e) =>
										onChangeTxt(e.target.value)
									}
									className="color-input block h-9 w-12 cursor-pointer rounded-md border-0 overflow-hidden focus-visible:outline-none"
								/>
							</span>

							<div>
								<div className="text-sm font-medium text-neutral-800">
									Selection highlight
								</div>
								<div className="text-xs text-neutral-500">
									For selected nodes & links
								</div>
								<div className="mt-0.5 text-xs text-neutral-700">
									{sel}
								</div>
							</div>

							<span className="inline-flex rounded-lg ring-1 ring-gray-300 shadow-sm p-0.5 hover:ring-gray-400 focus-within:ring-gray-500 transition">
								<input
									type="color"
									value={sel}
									onChange={(e) =>
										onChangeSel(e.target.value)
									}
									className="color-input block h-9 w-12 cursor-pointer rounded-md border-0 overflow-hidden focus-visible:outline-none"
								/>
							</span>

							<div>
								<div className="text-sm font-medium text-neutral-800">
									Dimmed base
								</div>
								<div className="text-xs text-neutral-500">
									For non-selected while highlighting
								</div>
								<div className="mt-0.5 text-xs text-neutral-700">
									{dim}
								</div>
							</div>

							<span className="inline-flex rounded-lg ring-1 ring-gray-300 shadow-sm p-0.5 hover:ring-gray-400 focus-within:ring-gray-500 transition">
								<input
									type="color"
									value={dim}
									onChange={(e) =>
										onChangeDim(e.target.value)
									}
									className="color-input block h-9 w-12 cursor-pointer rounded-md border-0 overflow-hidden focus-visible:outline-none"
								/>
							</span>
						</div>

						<div className="mt-4 flex items-center justify-end gap-2">
							<Menu.Item>
								{() => (
									<button
										type="button"
										className={clsx(
											"h-9 px-3 rounded-md border text-sm",
											"bg-white text-neutral-700 border-neutral-300 hover:bg-neutral-50"
										)}
										onClick={onCancel}
									>
										Cancel
									</button>
								)}
							</Menu.Item>
							<Menu.Item>
								{() => (
									<button
										type="button"
										className={clsx(
											"h-9 px-3 rounded-md border text-sm",
											"bg-neutral-900 text-white border-neutral-900 hover:bg-neutral-800"
										)}
										onClick={() =>
											onApply({ bg, sel, dim, txt })
										}
									>
										Apply
									</button>
								)}
							</Menu.Item>
						</div>
					</Menu.Items>
				</Transition>
			</Portal>
		</Menu>
	);
}

function SwatchDot({ color }) {
	return (
		<span
			className="inline-block h-3 w-3 rounded-full border border-neutral-300 ring-1 ring-black/10 ring-offset-1 ring-offset-white"
			style={{ background: color }}
		/>
	);
}

function FontMenu({ value, onChange }) {
	const btnRef = useRef(null);
	const [pos, setPos] = useState({ top: 0, left: 0 });
	const [loadedSet, setLoadedSet] = useState(() => new Set());
	const [loadingSet, setLoadingSet] = useState(() => new Set());

	const selectedLabel = useMemo(() => {
		const all = [...SYSTEM_FONTS, ...GOOGLE_FONTS];
		return all.find((f) => f.cssFamily === value)?.label || "Custom";
	}, [value]);

	useEffect(() => {
		GOOGLE_FONTS.forEach((f) => {
			const id = `link-gf-${(f.google?.family || f.label).toLowerCase()}`;
			if (document.getElementById(id)) {
				setLoadedSet((s) => new Set(s).add(f.label));
			}
		});
	}, []);

	useLayoutEffect(() => {
		const update = () => {
			const r = btnRef.current?.getBoundingClientRect();
			if (!r) return;
			setPos({ top: r.top, left: r.left });
		};
		update();
		window.addEventListener("resize", update);
		window.addEventListener("scroll", update, true);
		return () => {
			window.removeEventListener("resize", update);
			window.removeEventListener("scroll", update, true);
		};
	}, []);

	const handleLoaded = (label) => {
		console.log("[font] loaded", label);
		setLoadingSet((s) => {
			const n = new Set(s);
			n.delete(label);
			return n;
		});
		setLoadedSet((s) => new Set(s).add(label));
	};

	return (
		<Menu as="div" className="relative inline-block text-left select-none">
			<Menu.Button
				ref={btnRef}
				className={clsx(
					"inline-flex items-center gap-2 px-2.5 py-2 text-sm leading-none",
					"text-neutral-700 hover:text-neutral-900 rounded-md border",
					"border-neutral-300 bg-white shadow-sm hover:bg-neutral-50",
					"focus:outline-none focus-visible:ring-2 focus-visible:ring-black/10"
				)}
				onClick={() => console.log("[font] open")}
			>
				<span
					className="truncate max-w-[12rem]"
					style={{ fontFamily: value }}
				>
					{selectedLabel}
				</span>
				<ChevronDownIcon className="h-4 w-4" aria-hidden="true" />
			</Menu.Button>

			<Portal>
				<Transition
					as={Fragment}
					enter="transition ease-out duration-120"
					enterFrom="transform opacity-0 scale-95"
					enterTo="transform opacity-100 scale-100"
					leave="transition ease-in duration-90"
					leaveFrom="transform opacity-100 scale-100"
					leaveTo="transform opacity-0 scale-95"
				>
					<Menu.Items
						className="fixed z-[1200] min-w-[20rem] rounded-xl border border-neutral-200 shadow-xl bg-white origin-bottom-left overflow-hidden"
						style={{
							left: pos.left,
							top: pos.top,
							transform: "translateY(-8px) translateY(-100%)",
						}}
					>
						<div className="sticky top-0 z-10 bg-white/90 backdrop-blur px-3 py-2 text-xs uppercase tracking-wide text-neutral-500 border-b border-neutral-200">
							Font family
						</div>

						<div className="max-h-80 overflow-y-auto px-2 pb-2">
							<div className="px-2 py-1 text-[11px] uppercase tracking-wide text-neutral-500">
								System
							</div>
							{SYSTEM_FONTS.map((f) => (
								<MenuItemRow
									key={`system-${f.label}`}
									label={f.label}
									active={value === f.cssFamily}
									previewFamily={f.cssFamily}
									onClick={() => {
										console.log(
											"[font] select",
											f.cssFamily
										);
										onChange(f.cssFamily);
									}}
									trailing={null}
									disabled={false}
								/>
							))}

							<div className="px-2 pt-2 pb-1 text-[11px] uppercase tracking-wide text-neutral-500">
								Google
							</div>
							{GOOGLE_FONTS.map((f) => {
								const isLoaded = loadedSet.has(f.label);
								const isLoading = loadingSet.has(f.label);
								return (
									<MenuItemRow
										key={`google-${f.label}`}
										label={f.label}
										active={value === f.cssFamily}
										previewFamily={f.cssFamily}
										onClick={() => {
											console.log(
												"[font] select",
												f.cssFamily
											);
											onChange(f.cssFamily);
										}}
										trailing={
											<LoadGoogleFontIconButton
												font={f}
												isLoaded={isLoaded}
												isLoading={isLoading}
												onStart={() => {
													console.log(
														"[font] load start",
														f.label
													);
													setLoadingSet((s) =>
														new Set(s).add(f.label)
													);
												}}
												onLoaded={() =>
													handleLoaded(f.label)
												}
											/>
										}
										disabled={!isLoaded}
									/>
								);
							})}
						</div>

						<div className="sticky bottom-0 bg-white/90 backdrop-blur px-3 py-2 text-xs text-neutral-500 border-t border-neutral-200">
							Click the arrow to download a Google font for
							preview and use.
						</div>
					</Menu.Items>
				</Transition>
			</Portal>
		</Menu>
	);
}

function MenuItemRow({
	label,
	active,
	onClick,
	previewFamily,
	trailing,
	disabled,
}) {
	return (
		<Menu.Item disabled={disabled}>
			{({ active: hover, disabled: isDisabled }) => (
				<div
					className={clsx(
						"flex items-center justify-between rounded-md px-2.5 py-2.5 select-none transition-colors",
						hover && !isDisabled
							? "bg-neutral-100 cursor-pointer"
							: "cursor-default"
					)}
					onClick={() => {
						if (isDisabled) return;
						console.log("[font] click item", label);
						onClick();
					}}
					aria-disabled={isDisabled}
				>
					<div className="flex items-center gap-2">
						{active && !isDisabled ? (
							<CheckIcon className="h-4 w-4" />
						) : (
							<span className="h-4 w-4" />
						)}
						<span
							className={clsx(
								"truncate",
								isDisabled
									? "text-neutral-400"
									: "text-neutral-800"
							)}
							style={{ fontFamily: previewFamily }}
							title={label}
						>
							{label}
						</span>
					</div>
					{trailing ? (
						<div className="ml-2 flex items-center">{trailing}</div>
					) : null}
				</div>
			)}
		</Menu.Item>
	);
}

function LoadGoogleFontIconButton({
	font,
	isLoaded,
	isLoading,
	onStart,
	onLoaded,
}) {
	const linkId = `link-gf-${(
		font.google?.family || font.label
	).toLowerCase()}`;

	const loadFont = (e) => {
		e.stopPropagation();
		e.preventDefault();
		if (isLoaded || isLoading) return;
		onStart();
		if (document.getElementById(linkId)) {
			onLoaded();
			return;
		}
		const href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(
			font.google.family
		)}:${font.google.weights || "wght@400;700"}&display=swap`;
		const l = document.createElement("link");
		l.id = linkId;
		l.rel = "stylesheet";
		l.href = href;
		document.head.appendChild(l);
		l.onload = () => {
			console.log("[font] link onload", linkId);
			onLoaded();
		};
		console.log("[font] link appended", { id: linkId, href });
	};

	if (isLoaded) {
		return (
			<button
				type="button"
				aria-label="Downloaded"
				className="p-1 text-emerald-600"
				onClick={(e) => {
					e.stopPropagation();
					e.preventDefault();
					console.log("[font] already loaded", font.label);
				}}
				tabIndex={-1}
			>
				<CheckCircleIcon className="h-4 w-4" />
			</button>
		);
	}

	if (isLoading) {
		return (
			<button
				type="button"
				aria-label="Loading"
				className="p-1 text-amber-600"
				onClick={(e) => {
					e.stopPropagation();
					e.preventDefault();
				}}
				tabIndex={-1}
			>
				<ArrowPathIcon className="h-4 w-4 animate-spin" />
			</button>
		);
	}

	return (
		<button
			type="button"
			aria-label="Load"
			className="p-1 text-sky-600 hover:text-sky-700"
			onClick={loadFont}
			tabIndex={-1}
		>
			<ArrowDownTrayIcon className="h-4 w-4" />
		</button>
	);
}
