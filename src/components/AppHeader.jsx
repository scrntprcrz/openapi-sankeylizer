import clsx from "clsx";
import React from "react";

import { BoltIcon } from "@heroicons/react/24/solid";

export default function AppHeader({ rightSlot, children }) {
	const slot = rightSlot ?? children;

	return (
		<header
			className={clsx(
				"fixed top-0 left-0 right-0 z-40",
				"h-[var(--app-header-h)] shrink-0 border-b",
				"flex items-center justify-between px-3 bg-panel"
			)}
		>
			<div className="flex items-center gap-2 text-fore">
				<BoltIcon
					className="w-5 h-5  text-yellow-400"
					aria-hidden="true"
				/>
				<span className="font-medium">Sankeylizer 4000</span>
			</div>

			<div className="flex items-center gap-2">
				{slot ? (
					<div className="h-8 flex items-center">{slot}</div>
				) : null}
			</div>
		</header>
	);
}
