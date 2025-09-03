function resolveRef(root, ref) {
	if (typeof ref !== "string" || !ref.startsWith("#/")) return null;
	const unescapePointer = (s) => s.replace(/~1/g, "/").replace(/~0/g, "~");
	const parts = ref.slice(2).split("/").map(unescapePointer);
	let current = root;
	for (const part of parts) {
		if (current && Object.prototype.hasOwnProperty.call(current, part)) {
			current = current[part];
		} else {
			return null;
		}
	}
	return current;
}

function traverseSchema({
	schema,
	pathName,
	method,
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
			if (resolved) {
				traverseSchema({
					schema: resolved,
					pathName,
					method,
					section,
					propsMap,
					parentPrefix,
					rootDoc,
					visited,
					stack,
				});
			}
			return;
		}
		const combined = [];
		if (Array.isArray(schema.allOf)) combined.push(...schema.allOf);
		if (Array.isArray(schema.oneOf)) combined.push(...schema.oneOf);
		if (Array.isArray(schema.anyOf)) combined.push(...schema.anyOf);
		if (combined.length) {
			for (const subschema of combined) {
				traverseSchema({
					schema: subschema,
					pathName,
					method,
					section,
					propsMap,
					parentPrefix,
					rootDoc,
					visited,
					stack,
				});
			}
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
					if (typeof ap === "object") {
						traverseSchema({
							schema: ap,
							pathName,
							method,
							section,
							propsMap,
							parentPrefix: keyNodePath,
							rootDoc,
							visited,
							stack,
						});
					}
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
									method,
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
							method,
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
							method: http,
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
					method: http,
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

function computeRequestNotation(fieldId) {
	const parts = String(fieldId).split(".");
	if (parts[0] !== "request" || parts.length < 2) return null;
	const root = parts[1];
	const rest = parts.slice(2);
	switch (root) {
		case "query": {
			if (rest.length === 0) return "request.query";
			return `request.query.${rest.join(".")}`;
		}
		case "path": {
			if (rest.length === 0) return "request.path";
			return `request.path.${rest.join(".")}`;
		}
		case "header": {
			if (rest.length === 0) return "request.headers";
			const name = rest.join(".");
			if (name.includes(".")) {
				const partsHeader = name.split(".");
				return partsHeader
					.map((p, idx) =>
						idx === 0 ? `request.headers["${p}"]` : `["${p}"]`
					)
					.join("");
			}
			return `request.headers["${name}"]`;
		}
		case "cookie": {
			if (rest.length === 0) return "request.cookie";
			return `request.cookie.${rest.join(".")}`;
		}
		case "form":
		case "formData": {
			if (rest.length === 0) return "request.form";
			return `request.form.${rest.join(".")}`;
		}
		default: {
			if (parts.length === 2) {
				return `request.data.${root}`;
			}
			return `request.data.${root}.${rest.join(".")}`;
		}
	}
}

function computeResponseNotation(fieldId) {
	const parts = String(fieldId).split(".");
	if (parts[0] !== "response") return fieldId;
	const rest = parts.slice(1).join(".");
	return `response.${rest}`;
}

function buildRequestEdges(requestProps) {
	const edgeAgg = new Map();
	const keys = Array.from(requestProps.keys());
	const nonLeaf = new Set();
	for (const key of keys) {
		if (!key.startsWith("request")) continue;
		for (const other of keys) {
			if (other === key) continue;
			if (!other.startsWith("request")) continue;
			if (
				other.startsWith(key + ".") ||
				other.startsWith(key + "[") ||
				other.startsWith(key + "{")
			) {
				nonLeaf.add(key);
				break;
			}
		}
	}
	for (const [fullPath, info] of requestProps.entries()) {
		if (!fullPath.startsWith("request")) continue;
		if (nonLeaf.has(fullPath)) continue;
		const notation = computeRequestNotation(fullPath);
		if (!notation) continue;
		const paths = info.paths ? Array.from(info.paths) : [];
		let chainPaths;
		if (notation.startsWith("request.headers[")) {
			chainPaths = [notation, "request.headers"];
		} else {
			const segmentsRaw = splitPathSegments(notation);
			const joined = [];
			for (let i = 0; i < segmentsRaw.length; i++) {
				if (i === 0) joined.push(segmentsRaw[i]);
				else joined.push(`${joined[i - 1]}.${segmentsRaw[i]}`);
			}
			chainPaths = [];
			for (let i = joined.length - 1; i >= 0; i--) {
				chainPaths.push(joined[i]);
			}
		}
		if (
			chainPaths.length &&
			chainPaths[chainPaths.length - 1] === "request"
		) {
			chainPaths.pop();
		}
		for (const p of paths) {
			const routeId = `route::${p}`;
			for (let i = 0; i < chainPaths.length - 1; i++) {
				const from = chainPaths[i];
				const to = chainPaths[i + 1];
				const key = `${from}|${to}`;
				edgeAgg.set(key, (edgeAgg.get(key) || 0) + 1);
			}
			const last = chainPaths[chainPaths.length - 1];
			const key2 = `${last}|${routeId}`;
			edgeAgg.set(key2, (edgeAgg.get(key2) || 0) + 1);
		}
	}
	return edgeAgg;
}

function buildResponseEdges(responseProps) {
	const edgeAgg = new Map();
	const keys = Array.from(responseProps.keys());
	const nonLeaf = new Set();
	for (const key of keys) {
		if (!key.startsWith("response")) continue;
		for (const other of keys) {
			if (other === key) continue;
			if (!other.startsWith("response")) continue;
			if (
				other.startsWith(key + ".") ||
				other.startsWith(key + "[") ||
				other.startsWith(key + "{")
			) {
				nonLeaf.add(key);
				break;
			}
		}
	}
	for (const [fullPath, info] of responseProps.entries()) {
		if (!fullPath.startsWith("response")) continue;
		if (nonLeaf.has(fullPath)) continue;
		const notation = computeResponseNotation(fullPath);
		if (!notation) continue;
		const paths = info.paths ? Array.from(info.paths) : [];
		const segmentsRaw = splitPathSegments(notation);
		if (!segmentsRaw.length || segmentsRaw[0] !== "response") continue;
		const after = segmentsRaw.slice(1);
		if (after.length === 0) continue;
		const chainPaths = [];
		for (let i = 0; i < after.length; i++) {
			if (i === 0) chainPaths.push(`response.${after[0]}`);
			else chainPaths.push(`${chainPaths[i - 1]}.${after[i]}`);
		}
		for (const p of paths) {
			const routeId = `route::${p}`;
			const first = chainPaths[0];
			const keyStart = `${routeId}|${first}`;
			edgeAgg.set(keyStart, (edgeAgg.get(keyStart) || 0) + 1);
			for (let i = 0; i < chainPaths.length - 1; i++) {
				const from = chainPaths[i];
				const to = chainPaths[i + 1];
				const key = `${from}|${to}`;
				edgeAgg.set(key, (edgeAgg.get(key) || 0) + 1);
			}
		}
	}
	return edgeAgg;
}

function buildSankeyFromProps(requestProps, responseProps) {
	const edgeAgg = new Map();
	const reqEdges = buildRequestEdges(requestProps);
	const resEdges = buildResponseEdges(responseProps);
	for (const [k, w] of reqEdges.entries()) {
		edgeAgg.set(k, (edgeAgg.get(k) || 0) + w);
	}
	for (const [k, w] of resEdges.entries()) {
		edgeAgg.set(k, (edgeAgg.get(k) || 0) + w);
	}
	const rows = [];
	for (const [k, w] of edgeAgg.entries()) {
		const [from, to] = k.split("|");
		rows.push([from, to, w]);
	}
	return rows;
}

function hslToHex(h, s, l) {
	const _s = s / 100,
		_l = l / 100;
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

function buildColorPalette(count, s = 66, l = 54) {
	const phi = 0.618033988749895;
	let h = 0.21;
	const arr = [];
	for (let i = 0; i < count; i++) {
		h = (h + phi) % 1;
		arr.push(hslToHex(Math.round(h * 360), s, l));
	}
	return arr;
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

function generateSankeyFromOpenAPI(openapi) {
	const { requestProps, responseProps } = collectPropsFromOpenAPI(openapi);
	const rows = buildSankeyFromProps(requestProps, responseProps);

	const nodeOrder = uniqueNodesFromRows(rows);
	const colors = buildColorPalette(nodeOrder.length, 66, 54);

	return {
		sankey: {
			columns: ["string", "string", "number"],
			rows,
			options: {
				sankey: {
					node: { colors, nodePadding: 20 },
					link: { colorMode: "source", colors, curvature: 0.3 },
				},
			},
		},
	};
}

self.addEventListener("message", (event) => {
	const { type, spec } = event.data || {};
	if (type === "generate" && spec) {
		try {
			const result = generateSankeyFromOpenAPI(spec);
			self.postMessage({ type: "graph", graph: result });
		} catch (err) {
			self.postMessage({
				type: "error",
				message: err?.message || String(err),
			});
		}
	}
});
