import { Menu } from "@headlessui/react";
import {
	EllipsisVerticalIcon,
	MagnifyingGlassIcon,
	XMarkIcon,
} from "@heroicons/react/24/outline";
import clsx from "clsx";
import React from "react";

export default function Panel({ children, className }) {
	return (
		<section className={clsx("h-full flex flex-col", className)}>
			{children}
		</section>
	);
}

Panel.Header = function Header({ children, className }) {
	return (
		<header
			className={clsx(
				"shrink-0 h-10 flex items-center px-2  border-b border-t  border-sep ",
				className
			)}
		>
			{children}
		</header>
	);
};

Panel.HeaderTitle = function HeaderTitle({ children, className }) {
	return (
		<div
			className={clsx(
				"flex-1 min-w-0 truncate text-[15px] font-medium leading-5",
				className
			)}
		>
			{children}
		</div>
	);
};

Panel.HeaderActions = function HeaderActions({ children, className }) {
	return (
		<div className={clsx("flex items-center gap-1.5", className)}>
			{children}
		</div>
	);
};

Panel.HeaderMenu = function HeaderMenu({
	children,
	className,
	buttonAriaLabel = "Más opciones",
	buttonTitle = "Más opciones",
}) {
	return (
		<Menu
			as="div"
			className={clsx("relative inline-block text-left", className)}
		>
			<Menu.Button
				type="button"
				aria-label={buttonAriaLabel}
				title={buttonTitle}
				className={clsx(
					"inline-flex h-7 w-7 items-center justify-center rounded-md",
					"text-sep hover:text-black focus:outline-none"
				)}
			>
				<EllipsisVerticalIcon className="h-4 w-4" aria-hidden="true" />
				<span className="sr-only">{buttonTitle}</span>
			</Menu.Button>
			<Menu.Items
				className={clsx(
					"absolute right-0 z-20 mt-1.5 w-56 origin-top-right rounded-md border p-1 shadow-lg focus:outline-none",
					"border-sep bg-white"
				)}
			>
				{typeof children === "function" ? children({ Menu }) : children}
			</Menu.Items>
		</Menu>
	);
};

Panel.Search = function Search({
	value,
	onChange,
	onClear,
	placeholder = "Buscar… (⌘F)",
	inputId = "panel-search",
	className,
	onKeyDown,
}) {
	return (
		<div className={clsx("border-b p-2 border-sep", className)}>
			<label htmlFor={inputId} className="sr-only">
				Buscar
			</label>
			<div className="relative">
				<MagnifyingGlassIcon
					className={clsx(
						"absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 pointer-events-none",
						"text-sep"
					)}
					aria-hidden="true"
				/>
				<input
					id={inputId}
					type="text"
					value={value}
					onChange={onChange}
					onKeyDown={onKeyDown}
					placeholder={placeholder}
					className={clsx(
						"w-full rounded-md border pl-8 pr-7 py-1.5 text-sm outline-none",
						"border-sep"
					)}
					aria-label="Buscar"
				/>
				{value && (
					<button
						type="button"
						onClick={onClear}
						className={clsx(
							"absolute right-2 top-1/2 -translate-y-1/2 focus:outline-none",
							"text-sep hover:text-black"
						)}
						aria-label="Clear search"
						title="Clear search"
					>
						<XMarkIcon className="h-4 w-4" aria-hidden="true" />
						<span className="sr-only">Clear search</span>
					</button>
				)}
			</div>
		</div>
	);
};

Panel.Content = function Content({ children, className }) {
	return (
		<div
			className={clsx(
				"flex-1 min-h-0 overflow-y-auto vscroller p-0",
				className
			)}
		>
			{children}
		</div>
	);
};

Panel.Footer = function Footer({ children, className }) {
	return (
		<footer
			className={clsx(
				"shrink-0 px-3 py-2 border-t border-sep text-[11px]",
				className
			)}
		>
			{children}
		</footer>
	);
};
