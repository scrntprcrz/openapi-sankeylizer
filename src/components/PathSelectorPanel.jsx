import React, {
	useEffect,
	useMemo,
	useState,
	useRef,
	useCallback,
	memo,
} from "react";
import { CheckCircleIcon, NoSymbolIcon } from "@heroicons/react/24/outline";
import clsx from "clsx";

export default function PathSelectorPanel({ paths, onChange, className }) {
	const pathKeys = useMemo(() => Object.keys(paths || {}), [paths]);
	const [selected, setSelected] = useState(() => new Set(pathKeys));
	const shouldEmitRef = useRef(false);

	useEffect(() => {
		setSelected(new Set(pathKeys));
		shouldEmitRef.current = false;
	}, [pathKeys]);

	useEffect(() => {
		if (shouldEmitRef.current) {
			shouldEmitRef.current = false;
			onChange?.(Array.from(selected));
		}
	}, [selected, onChange]);

	const handleToggle = useCallback((id) => {
		setSelected((prev) => {
			const next = new Set(prev);
			next.has(id) ? next.delete(id) : next.add(id);
			return next;
		});
		shouldEmitRef.current = true;
	}, []);

	const selectAll = useCallback(() => {
		setSelected(new Set(pathKeys));
		shouldEmitRef.current = true;
	}, [pathKeys]);

	const clearAll = useCallback(() => {
		setSelected(new Set());
		shouldEmitRef.current = true;
	}, []);

	const hasPaths = pathKeys.length > 0;

	return (
		<div className={clsx("flex flex-col min-h-0", className)}>
			<div className="flex items-center justify-between bg-gray-100 rounded pl-3 pr-2 py-1">
				<div className="flex items-center gap-2">
					<span className="text-xs text-gray-700">Paths</span>
					<span className="text-xs text-gray-500">
						{selected.size}/{pathKeys.length}
					</span>
				</div>
				<div className="flex items-center gap-1">
					<button
						type="button"
						onClick={selectAll}
						title="Seleccionar todo"
						aria-label="Seleccionar todo"
						disabled={!hasPaths}
						className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-gray-100 hover:bg-gray-200 disabled:opacity-50"
					>
						<CheckCircleIcon className="w-4 h-4" />
					</button>
					<button
						type="button"
						onClick={clearAll}
						title="Deseleccionar"
						aria-label="Deseleccionar"
						disabled={!hasPaths}
						className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-gray-100 hover:bg-gray-200 disabled:opacity-50"
					>
						<NoSymbolIcon className="w-4 h-4" />
					</button>
				</div>
			</div>

			<ul className="flex-1 overflow-auto">
				{!hasPaths && (
					<li className="text-sm text-gray-400 px-3 h-7 flex items-center">
						No paths
					</li>
				)}
				{hasPaths &&
					pathKeys.map((k) => (
						<Row
							key={k}
							id={k}
							checked={selected.has(k)}
							onToggle={handleToggle}
						/>
					))}
			</ul>
		</div>
	);
}

const Row = memo(
	function Row({ id, checked, onToggle }) {
		return (
			<li>
				<label className="grid grid-cols-[auto,1fr] items-start gap-3 px-3 py-2 cursor-pointer hover:bg-gray-50">
					<input
						type="checkbox"
						className="mt-0.5"
						checked={checked}
						onChange={() => onToggle(id)}
						aria-label={id}
						title={id}
					/>
					<span
						className={clsx(
							"break-all leading-snug select-none  text-sm",
							checked ? "text-gray-900" : "text-gray-500"
						)}
					>
						{id}
					</span>
				</label>
			</li>
		);
	},
	(prev, next) => prev.checked === next.checked && prev.id === next.id
);
