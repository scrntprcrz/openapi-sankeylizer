import { ArrowDownTrayIcon, PlayCircleIcon } from "@heroicons/react/24/solid";

const publicExamples = [
	{
		name: "Petstore-expanded",
		url: "https://learn.openapis.org/examples/v3.0/petstore-expanded.html",
		file: "/petStore.json",
	},
	{
		name: "tictactoe",
		url: "https://learn.openapis.org/examples/v3.1/tictactoe.html",
		file: "/tictactoe.json",
	},
];

const companyExamples = [
	{
		name: "Galileo",
		url: "https://docs.galileo-ft.com/pro/reference/post_createpayment?json=on",
	},
	{
		name: "Pennylane",
		url: "https://pennylane.readme.io/reference/listcommercialdocuments?json=on",
	},
	{
		name: "Snipe-IT",
		url: "https://snipe-it.readme.io/reference/api-overview",
		//url: "https://snipe-it.readme.io/snipe-it/api-next/v2/branches/8.2.1/reference/companies?dereference=true&reduce=false",
	},
	{
		name: "Workable",
		url: "https://workable.readme.io/workable/api-next/v2/branches/3.17.0/reference/departments-merge?dereference=true&reduce=false",
	},
	{
		name: "Ruddr",
		url: "https://ruddr.readme.io/reference/create-a-client?json=on",
	},
	{
		name: "Vantage",
		url: "https://vantage.readme.io/reference/deleteresourcereport?json=on",
	},
	{
		name: "Layer1",
		url: "https://layer1.readme.io/reference/listtransactionrequests-1?json=on",
	},
	{
		name: "Budibase",
		url: "https://docs.budibase.com/reference/appunpublish?json=on",
	},
];

export default function ExampleOpenApiLinks({
	onLoadFromPublic,
	isLoading = false,
}) {
	const base = import.meta.env.BASE_URL || "/";

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
						className="inline-flex h-8 items-center justify-center gap-1 rounded-md px-3 text-xs font-medium bg-accent text-for-accent hover:opacity-90 disabled:opacity-60 whitespace-nowrap select-none transition"
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
		<section className={`mt-10 text-left`}>
			<header className="space-y-1">
				<h2 className="text-base font-semibold tracking-tight text-gray-900">
					Demo specifications
				</h2>
				<p className="text-sm text-gray-600">
					Public OpenAPI (v3.x) specs ready for quick testing.
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
					External provider docs whose JSON specs were used only to
					validate compatibility.
				</p>
			</header>

			<div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
				{companyExamples.map((item) => (
					<div key={`${item.name}-${item.url}`} className="py-1">
						{renderCompanyLink(item)}
					</div>
				))}
			</div>
		</section>
	);
}
