// node --test plugins/mock-kit/skills/mock-kit/scripts/json-tree.test.mjs
import assert from "node:assert/strict"
import { test } from "node:test"
import { containerPaths, jsonRows } from "../assets/kit/shell/jsonTree.js"

const state = { filter: "todas", orders: [{ id: 1, customer: "Ana Ribeiro" }, { id: 2, customer: "Rui Costa" }], open: null }
const lines = (rows) => rows.map((row) => `${"  ".repeat(row.depth)}${row.key === null ? "" : `${row.key}: `}${row.close ?? (row.container ? (row.open ? row.brackets[0] : `${row.brackets[0]}…${row.brackets[1]} ${row.count}`) : row.text)}`)

test("jsonRows lists every value, open by default", () => {
    assert.deepEqual(lines(jsonRows(state)), [
        "{",
        "  filter: \"todas\"",
        "  orders: [",
        "    0: {",
        "      id: 1",
        "      customer: \"Ana Ribeiro\"",
        "    }",
        "    1: {",
        "      id: 2",
        "      customer: \"Rui Costa\"",
        "    }",
        "  ]",
        "  open: null",
        "}",
    ])
})

test("a collapsed object or array shows one line with its size", () => {
    assert.deepEqual(lines(jsonRows(state, { collapsed: new Set(["/orders"]) })), ["{", "  filter: \"todas\"", "  orders: […] 2", "  open: null", "}"])
    assert.deepEqual(lines(jsonRows(state, { collapsed: new Set(["/orders/1"]) })).slice(7, 8), ["    1: {…} 2"])
})

test("search keeps the matches and their parents, opens them and marks the hits", () => {
    const rows = jsonRows(state, { collapsed: new Set(["/orders"]), query: "rui" })
    assert.deepEqual(lines(rows), ["{", "  orders: [", "    1: {", "      customer: \"Rui Costa\"", "    }", "  ]", "}"])
    assert.deepEqual(rows.filter((row) => row.hit).map((row) => row.path), ["/orders/1/customer"])
})

test("a key that matches keeps its whole value", () => {
    assert.deepEqual(lines(jsonRows(state, { query: "ORDERS" })).length, 12)
    assert.equal(jsonRows({ a: 1 }, { query: "zzz" }).length, 0)
})

test("containerPaths lists every object and array below the root, for collapse all", () => {
    assert.deepEqual(containerPaths(state), ["/orders", "/orders/0", "/orders/1"])
})
