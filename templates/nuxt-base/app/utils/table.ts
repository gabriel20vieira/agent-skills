import { normalizeText } from "#shared/utils/normalizeText"

export type SortDirection = "asc" | "desc"

export interface TableQuery {
    search?: string
    searchKeys?: string[]
    sort?: { key: string, dir: SortDirection } | null
    page?: number
    size?: number
}

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" })

function read(row: object, key: string): unknown {
    return (row as Record<string, unknown>)[key]
}

function compare(a: unknown, b: unknown): number {
    if (a == null) return b == null ? 0 : 1
    if (b == null) return -1
    if (typeof a === "number" && typeof b === "number") return a - b
    if (a instanceof Date && b instanceof Date) return a.getTime() - b.getTime()
    return collator.compare(String(a), String(b))
}

/** Client-side search (accent-insensitive), sort and pagination for DataTable. */
export function queryRows<T extends object>(rows: readonly T[], query: TableQuery) {
    const needle = normalizeText(query.search ?? "")
    let result = [...rows]
    if (needle && query.searchKeys?.length) {
        result = result.filter(row =>
            query.searchKeys!.some(key => normalizeText(String(read(row, key) ?? "")).includes(needle)))
    }
    if (query.sort) {
        const { key, dir } = query.sort
        result.sort((a, b) => (dir === "asc" ? 1 : -1) * compare(read(a, key), read(b, key)))
    }
    const size = query.size ?? (result.length || 1)
    const pages = Math.max(1, Math.ceil(result.length / size))
    const page = Math.min(Math.max(1, query.page ?? 1), pages)
    return { rows: result.slice((page - 1) * size, page * size), total: result.length, pages, page }
}
