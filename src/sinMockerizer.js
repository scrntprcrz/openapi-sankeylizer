const THEME_DEFAULT = {
	colors: {
		highlight: "#FFD60A",
		dim: "#BDBDBD",
		label: "#000000",
		background: "#ffffff",
		contrastLight: "#FFFFFF",
		contrastDark: "#000000",
	},
	font: {
		family: "system-ui, -apple-system",
		size: 10,
		bold: false,
		italic: false,
	},
	sankey: {
		nodePadding: 20,
		linkCurvature: 0.3,
	},
	palette: {
		startHue: 0.21,
		goldenRatio: 0.618033988749895,
		saturation: 66,
		lightness: 54,
	},
};

function resolveRef(root, ref) {
	if (typeof ref !== "string" || !ref.startsWith("#/")) return null;
	const unescapePointer = (s) => s.replace(/~1/g, "/").replace(/~0/g, "~");
	const parts = ref.slice(2).split("/").map(unescapePointer);
	let current = root;
	for (const part of parts) {
		if (current && Object.prototype.hasOwnProperty.call(current, part))
			current = current[part];
		else return null;
	}
	return current;
}

function traverseSchema({
	schema,
	pathName,
	section,
	propsMap,
	parentPrefix,
	rootDoc,
	visited = new WeakMap(),
	stack = new Set(),
}) {
	if (!schema || typeof schema !== "object") return;
	if (!(visited instanceof WeakMap)) visited = new WeakMap();
	const prefixKey = parentPrefix || "";
	let prefixes = visited.get(schema);
	if (!prefixes) {
		prefixes = new Set();
		visited.set(schema, prefixes);
	}
	if (prefixes.has(prefixKey)) return;
	if (stack.has(schema)) return;
	prefixes.add(prefixKey);
	stack.add(schema);
	try {
		if (schema.$ref) {
			const resolved = resolveRef(rootDoc, schema.$ref);
			if (resolved)
				traverseSchema({
					schema: resolved,
					pathName,
					section,
					propsMap,
					parentPrefix,
					rootDoc,
					visited,
					stack,
				});
			return;
		}
		const combined = [];
		if (Array.isArray(schema.allOf)) combined.push(...schema.allOf);
		if (Array.isArray(schema.oneOf)) combined.push(...schema.oneOf);
		if (Array.isArray(schema.anyOf)) combined.push(...schema.anyOf);
		if (combined.length) {
			for (const subschema of combined)
				traverseSchema({
					schema: subschema,
					pathName,
					section,
					propsMap,
					parentPrefix,
					rootDoc,
					visited,
					stack,
				});
			return;
		}
		if (
			schema.type === "object" ||
			schema.properties ||
			schema.additionalProperties
		) {
			const properties = schema.properties || {};
			for (const [propName, propSchema] of Object.entries(properties)) {
				const fullPath = parentPrefix
					? `${parentPrefix}.${propName}`
					: propName;
				const info = propsMap.get(fullPath) || {
					section,
					paths: new Set(),
				};
				info.paths.add(pathName);
				propsMap.set(fullPath, info);
				const hasObject =
					propSchema.type === "object" ||
					propSchema.properties ||
					propSchema.additionalProperties;
				const hasArrayOfObjects =
					propSchema.type === "array" &&
					propSchema.items &&
					(propSchema.items.properties ||
						propSchema.items.type === "object");
				const hasCombined =
					propSchema.allOf || propSchema.oneOf || propSchema.anyOf;
				if (
					propSchema.type === "array" &&
					propSchema.items &&
					propSchema.items.type &&
					typeof propSchema.items.type === "string" &&
					!(
						propSchema.items.properties ||
						propSchema.items.type === "object"
					)
				) {
					const itemPath = `${fullPath}[]`;
					const leaf = propsMap.get(itemPath) || {
						section,
						paths: new Set(),
					};
					leaf.paths.add(pathName);
					propsMap.set(itemPath, leaf);
				}
				if (
					propSchema.type === "object" &&
					propSchema.additionalProperties
				) {
					const ap = propSchema.additionalProperties;
					const keyNodePath = `${fullPath}.{key}`;
					const apInfo = propsMap.get(keyNodePath) || {
						section,
						paths: new Set(),
					};
					apInfo.paths.add(pathName);
					propsMap.set(keyNodePath, apInfo);
					if (typeof ap === "object")
						traverseSchema({
							schema: ap,
							pathName,
							section,
							propsMap,
							parentPrefix: keyNodePath,
							rootDoc,
							visited,
							stack,
						});
				}
				if (hasObject || hasArrayOfObjects || hasCombined) {
					const nextSchema = hasArrayOfObjects
						? propSchema.items
						: propSchema;
					if (hasCombined) {
						const combinedVariants = [];
						if (Array.isArray(nextSchema.allOf))
							combinedVariants.push(...nextSchema.allOf);
						if (Array.isArray(nextSchema.oneOf))
							combinedVariants.push(...nextSchema.oneOf);
						if (Array.isArray(nextSchema.anyOf))
							combinedVariants.push(...nextSchema.anyOf);
						for (const variant of combinedVariants) {
							if (
								variant &&
								(variant.type === "object" ||
									variant.properties ||
									variant.additionalProperties)
							) {
								traverseSchema({
									schema: variant,
									pathName,
									section,
									propsMap,
									parentPrefix: fullPath,
									rootDoc,
									visited,
									stack,
								});
							}
						}
					} else {
						traverseSchema({
							schema: nextSchema,
							pathName,
							section,
							propsMap,
							parentPrefix: fullPath,
							rootDoc,
							visited,
							stack,
						});
					}
				}
			}
			return;
		}
	} finally {
		stack.delete(schema);
	}
}

function mergePathItemParameters(op, pathParams, rootDoc) {
	if (!Array.isArray(pathParams) || pathParams.length === 0) return op;
	const opParams = Array.isArray(op.parameters) ? [...op.parameters] : [];
	const exists = new Set(
		opParams.map((p) => {
			const prm = p.$ref ? resolveRef(rootDoc, p.$ref) || {} : p;
			return `${prm.in}|${prm.name}`;
		})
	);
	for (const p of pathParams) {
		let actual = p;
		if (p.$ref) {
			const resolved = resolveRef(rootDoc, p.$ref);
			if (resolved) actual = resolved;
		}
		if (!actual || !actual.in || !actual.name) continue;
		const key = `${actual.in}|${actual.name}`;
		if (!exists.has(key)) {
			opParams.push(p);
			exists.add(key);
		}
	}
	return { ...op, parameters: opParams };
}

function collectPropsFromOpenAPI(openapi) {
	const pathsObj = openapi?.paths || {};
	const requestProps = new Map();
	const responseProps = new Map();
	for (const [route, methods] of Object.entries(pathsObj)) {
		const pathLevelParams = Array.isArray(methods?.parameters)
			? methods.parameters
			: [];
		for (const [methodKey, rawOp] of Object.entries(methods || {})) {
			if (methodKey === "parameters") continue;
			const http = String(methodKey).toLowerCase();
			const valid = new Set([
				"get",
				"post",
				"put",
				"delete",
				"patch",
				"options",
				"head",
			]);
			if (!valid.has(http)) continue;
			const op = mergePathItemParameters(rawOp, pathLevelParams, openapi);
			const pathName = route;
			if (op.responses) {
				for (const [_status, resp] of Object.entries(op.responses)) {
					let responseObj = resp;
					if (responseObj && responseObj.$ref) {
						const resolved = resolveRef(openapi, responseObj.$ref);
						if (resolved) responseObj = resolved;
					}
					if (!responseObj) continue;
					let schema;
					if (responseObj.content) {
						const contentObj = responseObj.content;
						let chosen =
							contentObj["application/json"] ||
							contentObj[Object.keys(contentObj)[0]];
						if (chosen && chosen.schema) schema = chosen.schema;
					} else if (responseObj.schema) {
						schema = responseObj.schema;
					}
					if (schema) {
						traverseSchema({
							schema,
							pathName,
							section: "response",
							propsMap: responseProps,
							parentPrefix: "response",
							rootDoc: openapi,
						});
					}
				}
			}
			let reqSchema;
			let reqPrefix;
			if (op.requestBody) {
				const content = op.requestBody.content || {};
				let chosen;
				let chosenMt;
				if (content["application/json"]) {
					chosen = content["application/json"];
					chosenMt = "application/json";
				} else if (content["application/x-www-form-urlencoded"]) {
					chosen = content["application/x-www-form-urlencoded"];
					chosenMt = "application/x-www-form-urlencoded";
				} else {
					const mt = Object.keys(content).find(
						(c) => c && c.startsWith("multipart/")
					);
					if (mt) {
						chosen = content[mt];
						chosenMt = mt;
					} else {
						const mts = Object.keys(content);
						if (mts.length) {
							chosenMt = mts[0];
							chosen = content[mts[0]];
						}
					}
				}
				if (chosen && chosen.schema) {
					reqSchema = chosen.schema;
					reqPrefix =
						chosenMt === "application/x-www-form-urlencoded" ||
						(chosenMt && chosenMt.startsWith("multipart/"))
							? "request.form"
							: "request";
				}
			}
			if (!reqSchema && Array.isArray(op.parameters)) {
				const bodyParam = op.parameters.find((p) => {
					if (p.$ref) {
						const resolved = resolveRef(openapi, p.$ref);
						return (
							resolved &&
							resolved.in === "body" &&
							resolved.schema
						);
					}
					return p.in === "body" && p.schema;
				});
				if (bodyParam) {
					const actualParam = bodyParam.$ref
						? resolveRef(openapi, bodyParam.$ref)
						: bodyParam;
					reqSchema = actualParam.schema;
					reqPrefix = "request";
				}
			}
			if (reqSchema) {
				traverseSchema({
					schema: reqSchema,
					pathName,
					section: "request",
					propsMap: requestProps,
					parentPrefix: reqPrefix,
					rootDoc: openapi,
				});
			}
			if (Array.isArray(op.parameters)) {
				for (const param of op.parameters) {
					let actualParam = param;
					if (param.$ref) {
						const resolved = resolveRef(openapi, param.$ref);
						if (resolved) actualParam = resolved;
					}
					if (!actualParam || !actualParam.in || !actualParam.name)
						continue;
					const paramIn = String(actualParam.in);
					const name = String(actualParam.name);
					let prefix;
					switch (paramIn) {
						case "query":
							prefix = "request.query";
							break;
						case "path":
							prefix = "request.path";
							break;
						case "header":
							prefix = "request.header";
							break;
						case "cookie":
							prefix = "request.cookie";
							break;
						case "formData":
							prefix = "request.formData";
							break;
						default:
							continue;
					}
					const fullPath = `${prefix}.${name}`;
					const info = requestProps.get(fullPath) || {
						section: "request",
						paths: new Set(),
					};
					info.paths.add(pathName);
					requestProps.set(fullPath, info);
				}
			}
		}
	}
	return { requestProps, responseProps };
}

function uniqueNodesFromRows(rows) {
	const order = [];
	const seen = new Set();
	for (const [from, to] of rows || []) {
		if (!seen.has(from)) {
			seen.add(from);
			order.push(from);
		}
		if (!seen.has(to)) {
			seen.add(to);
			order.push(to);
		}
	}
	return order;
}

function splitPathSegments(prop) {
	const segments = [];
	let cur = "";
	let bracket = 0;
	let brace = 0;
	for (let i = 0; i < prop.length; i++) {
		const c = prop[i];
		if (c === "." && bracket === 0 && brace === 0) {
			segments.push(cur);
			cur = "";
		} else {
			cur += c;
			if (c === "[") bracket++;
			else if (c === "]") bracket--;
			else if (c === "{") brace++;
			else if (c === "}") brace--;
		}
	}
	if (cur) segments.push(cur);
	return segments;
}

function prefixesFromId(id) {
	const parts = splitPathSegments(id);
	const out = [];
	for (let i = 0; i < parts.length; i++) {
		if (i === 0) out.push(parts[0]);
		else out.push(`${out[i - 1]}.${parts[i]}`);
	}
	return out;
}

function normalizeRequestKey(key) {
	if (!key.startsWith("request")) return key;
	if (key === "request.header") return "request.headers";
	if (key.startsWith("request.header."))
		return "request.headers." + key.slice("request.header.".length);
	if (key.startsWith("request.form."))
		return "request.data." + key.slice("request.form.".length);
	if (key.startsWith("request.formData."))
		return "request.data." + key.slice("request.formData.".length);
	if (key === "request.form" || key === "request.formData")
		return "request.data";
	const p = key.split(".");
	if (
		p[0] === "request" &&
		p[1] &&
		!["query", "headers", "path", "cookie", "data"].includes(p[1])
	) {
		return "request.data." + p.slice(1).join(".");
	}
	return key;
}

function buildLeafSets(map, rootPrefix) {
	const keys = Array.from(map.keys()).filter((k) => k.startsWith(rootPrefix));
	const nonLeaf = new Set();
	for (const k of keys) {
		for (const other of keys) {
			if (other === k) continue;
			if (
				other.startsWith(k + ".") ||
				other.startsWith(k + "[") ||
				other.startsWith(k + "{")
			) {
				nonLeaf.add(k);
				break;
			}
		}
	}
	const leaf = new Set(keys.filter((k) => !nonLeaf.has(k)));
	return { keys, nonLeaf, leaf };
}

function addEdge(edgeAgg, from, to, weight) {
	const key = `${from}|${to}`;
	edgeAgg.set(key, (edgeAgg.get(key) || 0) + (weight || 0));
}

function buildEdges(requestProps, responseProps) {
	const edgeAgg = new Map();

	const reqNormMap = new Map();
	for (const [k, info] of requestProps.entries()) {
		const nk = normalizeRequestKey(k);
		const normInfo = reqNormMap.get(nk) || {
			section: "request",
			paths: new Set(),
		};
		for (const p of info.paths || []) normInfo.paths.add(p);
		reqNormMap.set(nk, normInfo);
	}

	const { leaf: reqLeaf } = buildLeafSets(reqNormMap, "request");
	for (const key of reqLeaf) {
		const info = reqNormMap.get(key);
		if (!info) continue;
		const segs = prefixesFromId(key);
		if (!segs.length || segs[0] !== "request") continue;
		const routes = Array.from(info.paths || []);
		for (const route of routes) {
			for (let i = segs.length - 1; i >= 1; i--) {
				addEdge(edgeAgg, segs[i], segs[i - 1], 1);
			}
			addEdge(edgeAgg, "request", `route::${route}`, 1);
		}
	}

	const { leaf: resLeaf } = buildLeafSets(responseProps, "response");
	for (const key of resLeaf) {
		const info = responseProps.get(key);
		if (!info) continue;
		const segs = prefixesFromId(key);
		if (!segs.length || segs[0] !== "response") continue;
		const routes = Array.from(info.paths || []);
		for (const route of routes) {
			addEdge(edgeAgg, `route::${route}`, "response", 1);
			for (let i = 0; i < segs.length - 1; i++) {
				addEdge(edgeAgg, segs[i], segs[i + 1], 1);
			}
		}
	}

	const rows = [];
	for (const [k, w] of edgeAgg.entries()) {
		const [from, to] = k.split("|");
		rows.push([from, to, w]);
	}
	return rows;
}

function hslToHex(h, s, l) {
	const _s = s / 100;
	const _l = l / 100;
	const c = (1 - Math.abs(2 * _l - 1)) * _s;
	const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
	const m = _l - c / 2;
	let r = 0,
		g = 0,
		b = 0;
	if (0 <= h && h < 60) [r, g, b] = [c, x, 0];
	else if (60 <= h && h < 120) [r, g, b] = [x, c, 0];
	else if (120 <= h && h < 180) [r, g, b] = [0, c, x];
	else if (180 <= h && h < 240) [r, g, b] = [0, x, c];
	else if (240 <= h && h < 300) [r, g, b] = [x, 0, c];
	else [r, g, b] = [c, 0, x];
	const toHex = (v) =>
		Math.round((v + m) * 255)
			.toString(16)
			.padStart(2, "0");
	return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function buildColorPalette(
	count,
	s = THEME_DEFAULT.palette.saturation,
	l = THEME_DEFAULT.palette.lightness
) {
	const phi = THEME_DEFAULT.palette.goldenRatio;
	let h = THEME_DEFAULT.palette.startHue;
	const arr = [];
	for (let i = 0; i < count; i++) {
		h = (h + phi) % 1;
		arr.push(hslToHex(Math.round(h * 360), s, l));
	}
	return arr;
}

let __cache = { rows: null, nodeOrder: null, baseColors: null, apiInfo: null };

function buildHighlightMap(highlights, fallback) {
	const map = new Map();
	if (!Array.isArray(highlights)) return map;
	for (const item of highlights) {
		if (!item) continue;
		if (typeof item.id === "string" && item.id)
			map.set(
				item.id,
				typeof item.color === "string" && item.color
					? item.color
					: fallback
			);
	}
	return map;
}

function colorizeNodes(nodeOrder, highlightMap, dimColor, baseColors) {
	if (highlightMap && highlightMap.size > 0) {
		const idx = new Map(nodeOrder.map((id, i) => [id, i]));
		const colors = Array(nodeOrder.length).fill(dimColor);
		for (const [id, color] of highlightMap.entries()) {
			const i = idx.get(id);
			if (i != null) colors[i] = color;
		}
		return colors;
	}
	return baseColors || [];
}

function buildOptionsWithColors(nodeColors, labelColor, backgroundColor) {
	return {
		backgroundColor: backgroundColor || undefined,
		sankey: {
			node: {
				colors: nodeColors,
				nodePadding: THEME_DEFAULT.sankey.nodePadding,
				label: {
					fontName: THEME_DEFAULT.font.family,
					fontSize: THEME_DEFAULT.font.size,
					color: labelColor || THEME_DEFAULT.colors.label,
					bold: THEME_DEFAULT.font.bold,
					italic: THEME_DEFAULT.font.italic,
				},
			},
			link: {
				colorMode: "source",
				colors: nodeColors,
				curvature: THEME_DEFAULT.sankey.linkCurvature,
			},
		},
	};
}

function computeNodeWeights(rows) {
	const map = new Map();
	for (const [from, to, w] of rows || []) {
		map.set(from, (map.get(from) || 0) + (w || 0));
		map.set(to, (map.get(to) || 0) + (w || 0));
	}
	return map;
}

function nodeType(id) {
	if (typeof id !== "string") return "field";
	if (id.startsWith("route::")) return "route";
	if (id.startsWith("request.") || id === "request") return "field";
	if (id.startsWith("response.") || id === "response") return "field";
	return "field";
}

function buildNodeListObjectsOld(order, rows, reference) {
	const weights = computeNodeWeights(rows);
	const list = order.map((id) => ({
		id,
		name: id,
		weight: weights.get(id) || 0,
		type: nodeType(id),
		reference,
	}));
	for (let i = 0; i < rows.length; i++) {
		const [from, to, w] = rows[i];
		const edgeId = `${from} -> ${to}`;
		list.push({
			id: edgeId,
			name: edgeId,
			weight: w,
			type: "edge",
			reference,
		});
	}
	return list;
}

function buildNodeListObjects(order, rows, reference) {
	const weights = computeNodeWeights(rows);
	return order.map((id) => ({
		id,
		name: id,
		weight: weights.get(id) || 0,
		type: nodeType(id),
		reference,
	}));
}

function extractApiInfo(openapi) {
	const servers = Array.isArray(openapi?.servers) ? openapi.servers : [];
	const url = typeof servers?.[0]?.url === "string" ? servers[0].url : "";
	const version = String(openapi?.info?.version || "");
	const title = String(openapi?.info?.title || "");
	const description = String(openapi?.info?.description || "");
	return { url, version, title, description };
}

function generateSankeyFromOpenAPI(openapi, opts = {}) {
	const { requestProps, responseProps } = collectPropsFromOpenAPI(openapi);
	const rows = buildEdges(requestProps, responseProps);
	const nodeOrder = uniqueNodesFromRows(rows);
	const baseColors = buildColorPalette(
		nodeOrder.length,
		THEME_DEFAULT.palette.saturation,
		THEME_DEFAULT.palette.lightness
	);
	if (typeof opts.fontFamily === "string" && opts.fontFamily)
		THEME_DEFAULT.font.family = opts.fontFamily;
	const highlightMap = buildHighlightMap(
		opts.highlights,
		typeof opts.selectedColor === "string" && opts.selectedColor
			? opts.selectedColor
			: THEME_DEFAULT.colors.highlight
	);
	const dim =
		typeof opts.dimColor === "string" && opts.dimColor
			? opts.dimColor
			: THEME_DEFAULT.colors.dim;
	const nodeColors = colorizeNodes(nodeOrder, highlightMap, dim, baseColors);
	__cache.rows = rows;
	__cache.nodeOrder = nodeOrder;
	__cache.baseColors = baseColors;
	__cache.apiInfo = extractApiInfo(openapi);
	const background =
		typeof opts.backgroundColor === "string"
			? opts.backgroundColor
			: undefined;
	const labelColor = THEME_DEFAULT.colors.label;
	const options = buildOptionsWithColors(nodeColors, labelColor, background);
	return {
		sankey: { columns: ["string", "string", "number"], rows, options },
		list: buildNodeListObjects(nodeOrder, rows, nodeOrder.length),
		api: __cache.apiInfo,
	};
}

function repaintFromCache(opts = {}) {
	if (!__cache.nodeOrder || !__cache.rows)
		throw new Error("Repaint requested without cache");
	if (typeof opts.fontFamily === "string" && opts.fontFamily)
		THEME_DEFAULT.font.family = opts.fontFamily;
	const highlightMap = buildHighlightMap(
		opts.highlights,
		typeof opts.selectedColor === "string" && opts.selectedColor
			? opts.selectedColor
			: THEME_DEFAULT.colors.highlight
	);
	const dim =
		typeof opts.dimColor === "string" && opts.dimColor
			? opts.dimColor
			: THEME_DEFAULT.colors.dim;
	const nodeColors = colorizeNodes(
		__cache.nodeOrder,
		highlightMap,
		dim,
		__cache.baseColors
	);
	const background =
		typeof opts.backgroundColor === "string"
			? opts.backgroundColor
			: undefined;
	const labelColor = THEME_DEFAULT.colors.label;
	return {
		sankey: {
			columns: ["string", "string", "number"],
			rows: __cache.rows,
			options: buildOptionsWithColors(nodeColors, labelColor, background),
		},
		list: buildNodeListObjects(
			__cache.nodeOrder,
			__cache.rows,
			__cache.nodeOrder.length
		),
		api: __cache.apiInfo || {
			url: "",
			version: "",
			title: "",
			description: "",
		},
	};
}

self.addEventListener("message", (event) => {
	const {
		type,
		spec,
		highlights,
		dimColor,
		noRecalc,
		backgroundColor,
		selectedColor,
		fontFamily,
		hideUnselected,
	} = event.data || {};
	if (type !== "generate") return;
	try {
		if (noRecalc) {
			const graph = repaintFromCache({
				highlights,
				dimColor,
				backgroundColor,
				selectedColor,
				fontFamilyx: "s",
				hideUnselected,
			});
			self.postMessage({ type: "graph", graph });
			return;
		}
		if (!spec) throw new Error("Missing spec");
		const graph = generateSankeyFromOpenAPI(spec, {
			highlights,
			dimColor,
			backgroundColor,
			selectedColor,
			fontFamilyx: "s",
			hideUnselected,
		});
		self.postMessage({ type: "graph", graph });
	} catch (err) {
		self.postMessage({
			type: "error",
			message: err?.message || String(err),
		});
	}
});
