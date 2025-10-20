import { useState } from "react";
import { ArrowUpTrayIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { ArrowDownTrayIcon, PlayCircleIcon } from "@heroicons/react/24/solid";
import clsx from "clsx";
import { publicExamples, companyExamples } from "../lostAndFounds/examples";
import { QuestionMarkCircleIcon } from "@heroicons/react/24/solid";
import { OpenApiChromiumSteps } from "./OpenApiChromiumSteps";

const btn =
	"inline-flex items-center h-8 px-3 rounded-md text-sm font-medium bg-accent text-for-accent hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent shadow-sm cursor-pointer select-none";

export default function ExampleOpenApiLinks({
	onLoadFromPublic,
	isLoading = false,
}) {
	const base = import.meta.env.BASE_URL || "/";
	const [isStepsOpen, setIsStepsOpen] = useState(false);

	const renderPublicCard = (item) => {
		const fileUrl = `${base}${item.file.replace(/^\//, "")}`;
		return (
			<div
				key={`${item.name}-${item.url}`}
				className={`group flex items-center justify-between h-14 px-4 rounded-lg border border-gray-200 bg-white text-sm transition hover:ring-1 hover:ring-black/5 focus-within:ring-1 focus-within:ring-black/5 ${
					isLoading ? "opacity-70 pointer-events-none" : ""
				}`}
			>
				<div className="min-w-0">
					<p className="truncate font-medium text-gray-900">
						{item.name}
					</p>
					<p className="truncate text-xs text-gray-500">
						OpenAPI public spec
					</p>
				</div>

				<div className="flex items-center gap-2 shrink-0">
					<a
						href={fileUrl}
						download
						onClick={(e) => e.stopPropagation()}
						className="inline-flex h-8 w-8 items-center justify-center rounded-md text-gray-400 hover:text-gray-600 transition"
						title="Download JSON"
						aria-label="Download JSON"
					>
						<ArrowDownTrayIcon className="h-5 w-5" />
					</a>

					<button
						type="button"
						onClick={(e) => {
							e.preventDefault();
							e.stopPropagation();
							onLoadFromPublic?.(item.file);
						}}
						disabled={isLoading}
						className={clsx(btn)}
						title="Try now"
					>
						<PlayCircleIcon className="h-4 w-4" />
						Try
					</button>
				</div>
			</div>
		);
	};

	const renderCompanyLink = (item) => (
		<a
			key={`${item.name}-${item.url}`}
			href={item.url}
			target="_blank"
			rel="noopener noreferrer"
			className="group inline-flex items-center gap-2 text-sm font-medium text-accent "
			style={{
				color: "var(--link)",
			}}
			title="Open documentation"
		>
			<span className="truncate group-hover:underline underline-offset-4">
				{item.name}zz
			</span>
			<span aria-hidden="true" className="text-xs select-none">
				↗
			</span>
		</a>
	);

	return (
		<div
			className="fixed inset-0 z-0 overflow-y-auto"
			style={{
				top: "var(--app-header-h)",
				bottom: 0,
				WebkitOverflowScrolling: "touch",
			}}
		>
			<div className="text-center w-full min-h-full flex flex-col items-center justify-start sm:justify-center py-8">
				<p className="text-2xl sm:text-3xl font-semibold text-fore/90">
					Upload an OpenAPI (.json) file to generate the Sankey
					diagram.
				</p>
				{isLoading && (
					<p className="mt-4 text-sm text-fore/70">
						Loading example…
					</p>
				)}
				<div className="mt-6">
					<label htmlFor="openapi-file" className={clsx(btn)}>
						<ArrowUpTrayIcon
							className="w-5 h-5 mr-2 opacity-90"
							aria-hidden="true"
						/>
						<span>Upload OpenAPI file</span>
					</label>
					{/*<p className="mt-3 text-xs text-fore/60">
						Only .json with a valid OpenAPI spec (v3.x).
					</p>*/}
				</div>

				<section className="mt-10 text-left">
					<header className="space-y-1">
						<h2 className="text-base font-semibold tracking-tight text-gray-900">
							Demo specifications
						</h2>
						<p className="text-sm text-gray-600">
							Public OpenAPI specs ready for quick testing.
						</p>
					</header>

					<div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
						{publicExamples.map((item) => renderPublicCard(item))}
					</div>

					<header className="mt-8 space-y-1">
						<h2 className="text-base font-semibold tracking-tight text-gray-900">
							Company documentation (reference)
						</h2>
						<p className="text-sm text-gray-600">
							External provider docs whose JSON specs were used
							only to validate compatibility.
							<button
								type="button"
								onClick={() => setIsStepsOpen(true)}
								className="inline-flex items-center justify-center ml-1 h-4 w-4 relative top-px rounded-full text-gray-400 hover:text-gray-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
								title="help"
								aria-label="help"
							>
								<QuestionMarkCircleIcon className="h-4 w-4" />
							</button>
						</p>
					</header>

					<div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
						{companyExamples.map((item) => (
							<div
								key={`${item.name}-${item.url}`}
								className="py-1"
							>
								{renderCompanyLink(item)}
							</div>
						))}
					</div>
				</section>
			</div>

			{isStepsOpen && (
				<div className="fixed inset-0 z-50 flex items-center justify-center p-4">
					<div
						className="absolute inset-0 bg-black/40"
						onClick={() => setIsStepsOpen(false)}
					/>
					<div
						role="dialog"
						aria-modal="true"
						aria-labelledby="openapi-steps-title"
						className="relative z-10 w-full max-w-3xl rounded-lg bg-white shadow-xl"
					>
						<button
							type="button"
							onClick={() => setIsStepsOpen(false)}
							className="absolute top-2 right-2 inline-flex h-8 w-8 items-center justify-center rounded-md text-gray-500 hover:text-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
							title="Cerrar"
							aria-label="Cerrar"
						>
							<XMarkIcon className="h-5 w-5" />
						</button>

						<div className="p-4">
							<h3
								id="openapi-steps-title"
								className="text-base font-semibold tracking-tight text-gray-900"
							>
								How to extract the OpenAPI JSON from a “Powered
								by ReadMe” site?
							</h3>

							<OpenApiChromiumSteps className="mt-0" />
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
