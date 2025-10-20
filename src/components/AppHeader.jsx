import clsx from "clsx";

import { BeakerIcon } from "@heroicons/react/24/solid";
import React from "react";
import { useRecoilState } from "recoil";
import { hasGraphState } from "../state/atoms.js";
import {
	CommandLineIcon,
	MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";
import { useKBar } from "kbar";

function useIsApple() {
	if (typeof navigator === "undefined") return false;
	const platform = navigator.userAgentData?.platform || "";
	if (platform) return /Mac|iPhone|iPad|iPod/i.test(platform);
	const ua = navigator.userAgent || "";
	if (/iPad|iPhone|iPod/i.test(ua)) return true;
	if (/Macintosh/i.test(ua)) return true;
	return false;
}

function openCommandPalette(kbarQuery) {
	try {
		if (kbarQuery?.setOpen) {
			kbarQuery.setSearch?.("");
			kbarQuery.setOpen(true);
			return;
		}
	} catch {}
	try {
		if (kbarQuery?.toggle) {
			kbarQuery.toggle();
			return;
		}
	} catch {}
	try {
		const isApple = /Mac|iPhone|iPad|iPod/.test(navigator.platform);
		const evtInit = { key: "k", bubbles: true, cancelable: true };
		document.dispatchEvent(
			new KeyboardEvent("keydown", {
				...evtInit,
				metaKey: isApple,
				ctrlKey: !isApple,
			})
		);
	} catch {}
}

function refreshPage() {
	if (typeof window !== "undefined") window.location.reload();
}

export default function AppHeader() {
	const { query: kbarQuery } = useKBar();
	const isApple = useIsApple();
	const [hasGraph, setHasGraph] = useRecoilState(hasGraphState);

	return (
		<header
			className={clsx(
				"fixed top-0 left-0 right-0 z-40",
				"h-[var(--app-header-h)] shrink-0 border-b",
				"flex items-center justify-between px-3 bg-black/95 text-white border-neutral-900 "
			)}
		>
			<div className="flex items-center gap-2">
				<a
					href="/"
					className="inline-flex items-center gap-2 cursor-pointer focus:outline-none"
					onClick={(e) => {
						e.preventDefault();
						refreshPage();
					}}
				>
					<BeakerIcon
						className="w-5 h-5 text-[#39FF14]"
						aria-hidden="true"
					/>
					<span className="font-medium">Sankeylizer XE</span>
				</a>
			</div>

			{hasGraph && (
				<div className="flex items-center gap-2">
					<button
						type="button"
						onClick={() => openCommandPalette(kbarQuery)}
						className={clsx(
							"group relative flex items-center gap-2",
							"h-8 pl-3 pr-2 rounded-md",

							"border border-neutral-800 bg-neutral-900/80 shadow-sm",
							"hover:bg-neutral-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/50"
						)}
						aria-label={`Open command palette (${
							isApple ? "⌘K" : "Ctrl+K"
						})`}
						aria-haspopup="dialog"
						aria-keyshortcuts={isApple ? "Meta+K" : "Control+K"}
						title={`Open command palette (${
							isApple ? "⌘K" : "Ctrl+K"
						})`}
					>
						<MagnifyingGlassIcon
							className="w-4 h-4 opacity-80"
							aria-hidden="true"
						/>
						<span className="text-sm text-white/90 hidden sm:inline">
							Search nodes or run a command…
						</span>

						<span className="ml-1 hidden sm:inline-flex items-center gap-1 text-xs text-white/70">
							<kbd className="px-1.5 py-0.5 font-mono bg-white/10 border border-white/20 rounded">
								{isApple ? "⌘K" : "Ctrl+K"}
							</kbd>
						</span>

						<span className="sm:hidden">
							<CommandLineIcon
								className="w-4 h-4 opacity-70"
								aria-hidden="true"
							/>
						</span>
					</button>
				</div>
			)}
		</header>
	);
}
