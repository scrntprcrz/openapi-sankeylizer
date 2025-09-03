import { atom, selector } from "recoil";

export const activePanelState = atom({
	key: "activePanelState",
	default: null,
});

export const graphTypeState = atom({
	key: "graphTypeState",
	default: "request",
});

export const searchTextState = atom({
	key: "searchTextState",
	default: "",
});

export const doubleClickFocusEnabledState = atom({
	key: "doubleClickFocusEnabledState",
	default: true,
});

export const focusZoomRatioState = atom({
	key: "focusZoomRatioState",
	default: 0.4,
});

export const edgeColorState = atom({
	key: "edgeColorState",
	default: "#94a3b8",
});

export const searchQueryState = atom({
	key: "searchQueryState",
	default: "",
});

export const searchHistoryState = atom({
	key: "searchHistoryState",
	default: [],
});

export const multiSelectPathsState = atom({
	key: "multiSelectPathsState",
	default: true,
});

export const multiSelectFieldsState = atom({
	key: "multiSelectFieldsState",
	default: true,
});

export const activeRightPanelState = atom({
	key: "activeRightPanelState",
	default: null,
});

export const visibleCountsState = atom({
	key: "visibleCountsState",
	default: { nodes: 0, edges: 0 },
});

export const focusNodeColorState = atom({
	key: "focusNodeColorState",
	default: "#facc15",
});

export const focusEdgeColorState = atom({
	key: "focusEdgeColorState",
	default: "#eab308",
});

export const selectedHighlightColorState = atom({
	key: "selectedHighlightColorState",
	default: "#38bdf8",
});

export const customRequestGraphState = atom({
	key: "customRequestGraphState",
	default: null,
});

export const customResponseGraphState = atom({
	key: "customResponseGraphState",
	default: null,
});

export const exclusiveFocusState = atom({
	key: "exclusiveFocusState",
	default: false,
});

export const favoriteFieldsState = atom({
	key: "favoriteFieldsState",
	default: new Set(),
	effects_UNSTABLE: [
		({ setSelf, onSet }) => {
			try {
				const raw = localStorage.getItem("favoriteFields");
				if (raw) setSelf(new Set(JSON.parse(raw)));
			} catch {}
			onSet((newVal, _, isReset) => {
				try {
					if (isReset) {
						localStorage.removeItem("favoriteFields");
					} else {
						localStorage.setItem(
							"favoriteFields",
							JSON.stringify(Array.from(newVal))
						);
					}
				} catch {}
			});
		},
	],
});

export const panStepState = atom({
	key: "panStepState",
	default: 0.5,
});

export const panXState = atom({
	key: "panXState",
	default: 0,
});

export const panYState = atom({
	key: "panYState",
	default: 0,
});

export const zoomZState = atom({
	key: "zoomZState",
	default: 1,
});

export const requestColorsState = atom({
	key: "requestColorsState",
	default: {
		base: "#dc2626",
		dimmed: "#374151",
		highlight: "#facc15",
		selected: "#22d3ee",
	},
});

export const urlColorsState = atom({
	key: "urlColorsState",
	default: {
		base: "#d97706",
		dimmed: "#374151",
		highlight: "#facc15",
		selected: "#22d3ee",
	},
});

export const responseColorsState = atom({
	key: "responseColorsState",
	default: {
		base: "#16a34a",
		dimmed: "#374151",
		highlight: "#facc15",
		selected: "#22d3ee",
	},
});

export const requestEdgeColorsState = atom({
	key: "requestEdgeColorsState",
	default: {
		base: "#9f1239",
		dimmed: "#374151",
		highlight: "#facc15",
		selected: "#22d3ee",
	},
});
export const urlEdgeColorsState = atom({
	key: "urlEdgeColorsState",
	default: {
		base: "#b45309",
		dimmed: "#374151",
		highlight: "#facc15",
		selected: "#22d3ee",
	},
});
export const responseEdgeColorsState = atom({
	key: "responseEdgeColorsState",
	default: {
		base: "#166534",
		dimmed: "#374151",
		highlight: "#facc15",
		selected: "#22d3ee",
	},
});

export const requestFieldColorState = atom({
	key: "requestFieldColorState",
	default: "#dc2626",
});

export const urlFieldColorState = atom({
	key: "urlFieldColorState",
	default: "#d97706",
});

export const responseFieldColorState = atom({
	key: "responseFieldColorState",
	default: "#16a34a",
});

export const hasAnySelectionSelector = selector({
	key: "hasAnySelectionSelector",
	get: ({ get }) => {
		const selected = get(selectedNodesSelector);
		const highlighted = get(highlightedNodesState);
		return selected.size > 0 || highlighted.length > 0;
	},
});

export const dimmedColorState = atom({
	key: "dimmedColorState",
	default: "#374151",
});

export const highlightedNodesState = atom({
	key: "highlightedNodesState",
	default: [],
});

export const selectedNodeIdState = atom({
	key: "selectedNodeIdState",
	default: null,
});

export const selectedNodesSelector = selector({
	key: "selectedNodesSelector",
	get: ({ get }) => {
		const paths = get(selectedPathsState);

		const out = new Set();
		paths.forEach((p) => out.add(`route::${p}`));

		return out;
	},
});

export const lowOpacityUnlinkedState = atom({
	key: "lowOpacityUnlinkedState",
	default: true,
});

export const selectedPathsState = atom({
	key: "selectedPathsState",
	default: new Set(),
});

export const selectedFieldsState = atom({
	key: "selectedFieldsState",
	default: new Set(),
});
export const selectedNodesState = atom({
	key: "selectedNodesState",
	default: new Set(),
});
