import { describe, expect, it } from "vitest"
import { queryRows } from "../../app/utils/table"

const rows = [
    { id: 1, name: "Árvore", age: 30 },
    { id: 2, name: "banana", age: 10 },
    { id: 3, name: "Casa", age: 20 },
]

describe("queryRows", () => {
    it("searches accent- and case-insensitively on the given keys", () => {
        expect(queryRows(rows, { search: "arv", searchKeys: ["name"] }).rows.map(row => row.id)).toEqual([1])
        expect(queryRows(rows, { search: "  CASA ", searchKeys: ["name"] }).rows.map(row => row.id)).toEqual([3])
    })
    it("sorts numbers and text in both directions", () => {
        expect(queryRows(rows, { sort: { key: "age", dir: "asc" } }).rows.map(row => row.id)).toEqual([2, 3, 1])
        expect(queryRows(rows, { sort: { key: "name", dir: "desc" } }).rows.map(row => row.id)).toEqual([3, 2, 1])
    })
    it("paginates and reports totals", () => {
        const result = queryRows(rows, { page: 2, size: 2 })
        expect(result).toMatchObject({ total: 3, pages: 2 })
        expect(result.rows.map(row => row.id)).toEqual([3])
    })
    it("clamps an out-of-range page to the last one", () => {
        expect(queryRows(rows, { page: 9, size: 2 }).page).toBe(2)
        expect(queryRows([], { page: 3, size: 2 })).toMatchObject({ page: 1, pages: 1, total: 0 })
    })
})
