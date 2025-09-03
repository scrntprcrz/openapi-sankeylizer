import { CheckIcon } from "@heroicons/react/24/outline";
import clsx from "clsx";
import Fuse from "fuse.js";
import React, {
	useDeferredValue,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import Highlighter from "react-highlight-words";
import { useRecoilState, useSetRecoilState } from "recoil";
import {
	exclusiveFocusState,
	favoriteFieldsState,
	multiSelectFieldsState,
	selectedFieldsState,
	selectedNodeIdState,
} from "../../../state/atoms.js";
import Panel from "../../Panel.jsx";

const STANDALONE_FIELDS = Object.freeze([
	{ id: "title", label: "Título" },
	{ id: "description", label: "Descripción" },
	{ id: "createdAt", label: "Creado el" },
	{ id: "updatedAt", label: "Actualizado el" },
	{ id: "owner", label: "Propietario" },
]);

export default function FieldsPanel({ fields }) {
	const [selectedFields, setSelectedFields] =
		useRecoilState(selectedFieldsState);
	const [multi, setMulti] = useRecoilState(multiSelectFieldsState);
	const [favoriteFields, setFavoriteFields] =
		useRecoilState(favoriteFieldsState);
	const setSelectedNodeId = useSetRecoilState(selectedNodeIdState);
	const setExclusiveFocus = useSetRecoilState(exclusiveFocusState);

	const [searchQuery, setSearchQuery] = useState("");
	const deferredQuery = useDeferredValue(searchQuery);

	const [internalFields] = useState(STANDALONE_FIELDS);

	const effectiveFields = useMemo(
		() =>
			Array.isArray(fields) && fields.length ? fields : internalFields,
		[fields, internalFields]
	);

	const fuseOptions = useMemo(
		() => ({
			includeScore: false,
			ignoreLocation: true,
			threshold: 0.3,
			minMatchCharLength: 2,
			keys: ["label", "id"],
		}),
		[]
	);

	const fuseIndex = useMemo(
		() => Fuse.createIndex(fuseOptions.keys, effectiveFields),
		[effectiveFields, fuseOptions]
	);

	const fuse = useMemo(
		() => new Fuse(effectiveFields, fuseOptions, fuseIndex),
		[effectiveFields, fuseOptions, fuseIndex]
	);

	const filteredFields = useMemo(() => {
		const q = deferredQuery.trim();
		if (!q) return effectiveFields;
		const ids = new Set(fuse.search(q).map((r) => r.item.id));
		return effectiveFields.filter(
			(f) => ids.has(f.id) || selectedFields.has(f.id)
		);
	}, [effectiveFields, fuse, deferredQuery, selectedFields]);

	const prevMultiRef = useRef(multi);
	useEffect(() => {
		if (prevMultiRef.current && !multi) setSelectedFields(new Set());
		prevMultiRef.current = multi;
	}, [multi, setSelectedFields]);

	function toggleField(id) {
		let next;
		if (!multi) {
			next = selectedFields.has(id) ? new Set() : new Set([id]);
		} else {
			next = new Set(selectedFields);
			next.has(id) ? next.delete(id) : next.add(id);
		}
		setSelectedFields(next);
		setSelectedNodeId(id);
		if (window.__focusNode) window.__focusNode(id);
		setExclusiveFocus(false);
	}

	const toggleFavorite = (id) =>
		setFavoriteFields((prev) => {
			const next = new Set(prev);
			next.has(id) ? next.delete(id) : next.add(id);
			return next;
		});

	return (
		<Panel>
			<Panel.Header>
				<Panel.HeaderTitle>Campos</Panel.HeaderTitle>
				<Panel.HeaderActions>
					<Panel.HeaderMenu>
						{({ Menu }) => (
							<Menu.Item>
								{({ active }) => (
									<button
										type="button"
										role="menuitemcheckbox"
										aria-checked={multi}
										onClick={() => setMulti((p) => !p)}
										className={clsx(
											"flex w-full items-center justify-between rounded px-3 py-2 text-[13px]   ",
											active &&
												"bg-accent text-for-accent  "
										)}
									>
										<span className="text-left">
											Seleccionar múltiple
										</span>
										{multi && (
											<CheckIcon
												className="h-4 w-4"
												aria-hidden="true"
											/>
										)}
									</button>
								)}
							</Menu.Item>
						)}
					</Panel.HeaderMenu>
				</Panel.HeaderActions>
			</Panel.Header>

			<Panel.Search
				value={searchQuery}
				onChange={(e) => setSearchQuery(e.target.value)}
				onClear={() => setSearchQuery("")}
				placeholder="Buscar…"
			/>

			<Panel.Content>
				<ul>
					{filteredFields.map((f) => {
						const selected = selectedFields.has(f.id);
						const favored = favoriteFields.has(f.id);
						return (
							<li key={f.id} title={f.id}>
								<div
									className={clsx(
										"row flex items-center gap-2 text-[13px] leading-5 py-3 pl-3 pr-3 select-none cursor-pointer"
									)}
									onClick={() => toggleField(f.id)}
									onDoubleClick={() => toggleField(f.id)}
									aria-selected={selected}
								>
									<span className="flex-1 min-w-0 truncate">
										<Highlighter
											autoEscape
											highlightClassName="bg-yellow-200 text-black rounded-xs px-0.5"
											searchWords={[deferredQuery]}
											textToHighlight={f.label}
										/>
									</span>

									<div className="flex items-center gap-1.5">
										<button
											type="button"
											onClick={(e) => {
												e.stopPropagation();
												toggleField(f.id);
											}}
											className={clsx(
												"inline-flex h-6 w-6 items-center justify-center rounded border  border-sep",
												selected
													? "bg-[--accent] border-[--accent] text-for-accent"
													: "border-sep bg-transparent"
											)}
											aria-label={
												selected
													? "Deseleccionar"
													: "Seleccionar"
											}
											title={
												selected
													? "Deseleccionar"
													: "Seleccionar"
											}
										>
											{selected && (
												<CheckIcon
													className="h-4 w-4"
													aria-hidden="true"
												/>
											)}
										</button>
									</div>
								</div>
							</li>
						);
					})}

					{effectiveFields.length === 0 && (
						<li className="px-3 py-2 text-[12px] text-muted">
							No hay campos.
						</li>
					)}
					{effectiveFields.length > 0 &&
						filteredFields.length === 0 &&
						searchQuery && (
							<li className="px-3 py-2 text-[12px] text-muted">
								Sin resultados para “{searchQuery}”.
							</li>
						)}
				</ul>
			</Panel.Content>
		</Panel>
	);
}
