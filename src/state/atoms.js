import { atom, selector } from "recoil";
import { kebabCase, trim } from "lodash";

export const graphTypeState = atom({
	key: "graphTypeState",
	default: "request",
});

export const customRequestGraphState = atom({
	key: "customRequestGraphState",
	default: null,
});

export const titleSelector = selector({
	key: "titleSelector",
	get: ({ get }) => {
		const graph = get(customRequestGraphState);
		const url = graph?.api?.title;
		return typeof url === "string" && url.trim().length > 0 ? url : "";
	},
});

export const exportFileNameSelector = selector({
	key: "exportFileNameSelector",
	get: ({ get }) => {
		const graph = get(customRequestGraphState);
		const title = graph?.api?.title;
		if (typeof title !== "string") return "";
		const cleaned = trim(title);
		if (cleaned.length === 0) return "";
		const normalized = kebabCase(cleaned);
		return normalized.length > 0 ? normalized : "";
	},
});

export const kbarNodesSelector = selector({
	key: "kbarNodesSelector",
	get: ({ get }) => {
		const graph = get(customRequestGraphState);
		const { tab } = get(kbarFilterState);
		const list = Array.isArray(graph?.list) ? graph.list : [];
		const filtered = list.filter((n) => {
			const type = String(n?.type || "").toLowerCase();
			const kind = type === "route" ? "route" : "field";
			if (tab === "Routes") return kind === "route";
			if (tab === "Fields") return kind === "field";
			return true;
		});
		return filtered.map((n) => ({
			id: n.id,
			name: typeof n?.name === "string" ? n.name : String(n?.id ?? ""),
			type: n.type,
		}));
	},
});

export const selectedNodesState = atom({
	key: "selectedNodesState",
	default: new Set(),
});

export const hideUnselectedState = atom({
	key: "hideUnselectedState",
	default: false,
});

export const hasGraphState = atom({
	key: "hasGraphState",
	default: false,
});

export const backgroundColorAtom = atom({
	key: "backgroundColorAtom",
	default: "#f3f4f6",
});

export const selectedColorAtom = atom({
	key: "selectedColorAtom",
	default: "#00FF00",
});

export const dimColorAtom = atom({
	key: "dimColorAtom",
	default: "#9ca3af",
});

export const textColorAtom = atom({
	key: "textColorAtom",
	default: "#000000",
});

export const selectedFontAtom = atom({
	key: "selectedFontAtom",
	default:
		'system-ui, -apple-system, "Segoe UI", Roboto, Ubuntu, Cantarell, "Noto Sans", "Helvetica Neue", Arial, sans-serif',
});

export const kbarFilterState = atom({
	key: "kbarFilterState",
	default: { tab: "All" },
});

export const exportUsePureAtom = atom({
	key: "exportUsePureAtom",
	default: false,
});
