import clsx from "clsx";

function Key({ children }) {
	return (
		<kbd className="px-1.5 py-0.5 font-mono text-xs border rounded bg-gray-50">
			{children}
		</kbd>
	);
}

export function OpenApiChromiumSteps({ className }) {
	return (
		<section className={clsx("mt-5 space-y-4", className)}>
			<ol className="list-decimal pl-5 text-sm text-gray-800 space-y-5">
				<li>
					Open DevTools, go to <strong>Network</strong>, and enable{" "}
					<strong>Preserve log</strong>.
					<div className="mt-3 space-y-2">
						<div className="flex flex-wrap items-center gap-2">
							<span className="text-xs text-gray-600">
								macOS:
							</span>
							<Key>⌘</Key>
							<Key>⌥</Key>
							<Key>I</Key>
						</div>
						<div className="flex flex-wrap items-center gap-2">
							<span className="text-xs text-gray-600">
								Windows/Linux:
							</span>
							<Key>F12</Key>
							<span className="text-xs text-gray-400">or</span>
							<Key>Ctrl</Key>
							<Key>Shift</Key>
							<Key>I</Key>
						</div>
						<div className="flex flex-wrap items-center gap-2">
							<span className="text-xs text-gray-600">
								Menu (Chromium):
							</span>
							<Key>Menu</Key>
							<span>→</span>
							<Key>More tools</Key>
							<span>→</span>
							<Key>Developer tools</Key>
						</div>
					</div>
				</li>

				<li>
					Open the docs and choose <strong>JSON</strong> as the
					language. If you see <strong>“Try It!”</strong>, click it to
					run the request and view the response.
					<p className="mt-2 text-xs text-gray-600">
						If there’s no <strong>“Try It!”</strong>, reload the
						page to capture requests.
					</p>
					<p className="mt-1 text-xs text-gray-600">
						If reloading doesn’t produce useful requests, browse
						through several sections of the docs to trigger more
						requests.
					</p>
				</li>

				<li>
					Open global search and enable regular expressions.
					<div className="mt-3 space-y-2">
						<div className="flex flex-wrap items-center gap-2">
							<span className="text-xs text-gray-600">
								macOS:
							</span>
							<Key>⌘</Key>
							<Key>⌥</Key>
							<Key>F</Key>
						</div>
						<div className="flex flex-wrap items-center gap-2">
							<span className="text-xs text-gray-600">
								Windows/Linux:
							</span>
							<Key>Ctrl</Key>
							<Key>Shift</Key>
							<Key>F</Key>
						</div>
						<div className="flex flex-wrap items-center gap-2">
							<span>Enable</span>
							<Key>Regular expression (.*)</Key>
							in search
						</div>
						<div className="space-y-2">
							Search for:
							<pre className="p-2 bg-gray-50 rounded border text-[12px] leading-5 overflow-auto">{`(?:^|[{\[,]\\s*)"openapi"\\s*:\\s*"3(?:\\.\\d{1,3}){0,2}"(?=\\s*[,\\}\\]])`}</pre>
						</div>
					</div>
				</li>

				<li>
					Copy the found <strong>JSON</strong> into your text editor
					and save it with a{" "}
					<strong>
						<span className="font-mono">.json</span>
					</strong>{" "}
					extension (e.g.,
					<span className="font-mono">openapi.json</span>,{" "}
					<span className="font-mono">spec_merchant.json</span>).
				</li>
			</ol>
		</section>
	);
}

/*

<h3 className="text-base font-semibold tracking-tight text-gray-900">
How to extract the OpenAPI JSON from a “Powered by ReadMe” site?
</h3>*/
