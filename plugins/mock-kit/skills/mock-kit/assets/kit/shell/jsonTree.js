// The rows of a JSON tree view, without Vue, so the logic is testable in Node. Used by MockJson.
//
// A row is one of:
// - a value:     { path, depth, key, text, type, hit }
// - a container: { path, depth, key, container: true, open, brackets, count, hit }
// - a closing:   { path: path + "#end", depth, key: null, close }
// key is null for the root, the index for array items, the property name otherwise.

const typeOf = (value) => (value === null ? "null" : Array.isArray(value) ? "array" : typeof value)

/** Rows to show. collapsed: Set of container paths; query: case-insensitive text to search
 * in keys and values. With a query, only matches and their parents are shown, opened. */
export function jsonRows(value, { collapsed = new Set(), query = "" } = {}) {
    const q = query.trim().toLowerCase()
    const hit = (text) => q !== "" && String(text).toLowerCase().includes(q)
    const keyHit = (key, inArray) => !inArray && key !== null && hit(key)
    const subtreeHits = (key, inArray, val) => {
        if (keyHit(key, inArray)) return true
        if (val !== null && typeof val === "object") {
            const array = Array.isArray(val)
            return Object.entries(val).some(([k, v]) => subtreeHits(k, array, v))
        }
        return hit(JSON.stringify(val))
    }
    const rows = []
    const walk = (key, inArray, val, path, depth, whole) => {
        if (q && !whole && !subtreeHits(key, inArray, val)) return
        const own = keyHit(key, inArray)
        if (val === null || typeof val !== "object") {
            const text = JSON.stringify(val) ?? String(val)
            rows.push({ path, depth, key, text, type: typeOf(val), hit: own || hit(text) })
            return
        }
        const array = Array.isArray(val)
        const entries = Object.entries(val)
        const brackets = array ? ["[", "]"] : ["{", "}"]
        const open = q ? true : !collapsed.has(path)
        rows.push({ path, depth, key, container: true, open, brackets, count: entries.length, hit: own })
        if (!open) return
        for (const [k, v] of entries) walk(array ? Number(k) : k, array, v, `${path}/${k}`, depth + 1, whole || own)
        rows.push({ path: `${path}#end`, depth, key: null, close: brackets[1] })
    }
    walk(null, false, value, "", 0, false)
    return rows
}

/** Paths of every object and array below the root (to collapse all). */
export function containerPaths(value, path = "") {
    if (value === null || typeof value !== "object") return []
    return Object.entries(value).flatMap(([k, v]) => (v !== null && typeof v === "object" ? [`${path}/${k}`, ...containerPaths(v, `${path}/${k}`)] : []))
}

/** Splits text around the query, for highlighting: [{ text, match }]. */
export function highlight(text, query) {
    const q = query.trim().toLowerCase()
    if (!q) return [{ text, match: false }]
    const parts = []
    const lower = text.toLowerCase()
    let at = 0
    for (let found = lower.indexOf(q); found >= 0; found = lower.indexOf(q, at)) {
        if (found > at) parts.push({ text: text.slice(at, found), match: false })
        parts.push({ text: text.slice(found, found + q.length), match: true })
        at = found + q.length
    }
    if (at < text.length) parts.push({ text: text.slice(at), match: false })
    return parts
}
