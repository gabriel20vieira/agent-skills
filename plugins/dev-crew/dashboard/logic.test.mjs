// node --test plugins/dev-crew/dashboard/logic.test.mjs
import assert from "node:assert/strict"
import { test } from "node:test"
import { buildTree, countRunning, estimateCost, isStale, normalizeLimits, OUTPUT_PRICE_PER_MTOK } from "./logic.js"

const now = Date.parse("2026-10-17T12:00:00Z")
const ago = (ms) => new Date(now - ms).toISOString()

test("normalizeLimits fills defaults and clamps bad values", () => {
    assert.deepEqual(normalizeLimits(null), { opus: 2, sonnet: 4, haiku: 6 })
    assert.deepEqual(normalizeLimits({ sonnet: "3", haiku: -1 }), { opus: 2, sonnet: 3, haiku: 6 })
})

test("isStale only flags active agents silent for over 10 minutes", () => {
    assert.equal(isStale({ status: "running", updatedAt: ago(600001) }, now), true)
    assert.equal(isStale({ status: "running", updatedAt: ago(1000) }, now), false)
    assert.equal(isStale({ status: "done", updatedAt: ago(9e6) }, now), false)
})

test("isStale flags active agents with a missing or invalid updatedAt", () => {
    assert.equal(isStale({ status: "running" }, now), true)
    assert.equal(isStale({ status: "fixing", updatedAt: "not a date" }, now), true)
    assert.equal(isStale({ status: "done" }, now), false)
})

test("output prices match the current models", () => {
    assert.deepEqual(OUTPUT_PRICE_PER_MTOK, { opus: 20, sonnet: 10, haiku: 0.5 })
})

test("countRunning counts active agents per model and skips stale ones", () => {
    assert.deepEqual(countRunning([], now), { opus: 0, sonnet: 0, haiku: 0 })
    const agents = [
        { model: "sonnet", status: "running", updatedAt: ago(1000) },
        { model: "sonnet", status: "running", updatedAt: ago(1000) },
        { model: "sonnet", status: "running", updatedAt: ago(700000) },
        { model: "haiku", status: "fixing", updatedAt: ago(1000) },
        { model: "opus", status: "done", updatedAt: ago(1000) },
    ]
    assert.deepEqual(countRunning(agents, now), { opus: 0, sonnet: 2, haiku: 1 })
})

test("buildTree nests agents by parentId and keeps orphans as roots", () => {
    const tree = buildTree([
        { id: "checker-1", parentId: "developer-1" },
        { id: "main", parentId: null },
        { id: "developer-1", parentId: "coordinator-1" },
        { id: "coordinator-1", parentId: "main" },
        { id: "lost", parentId: "gone" },
    ])
    assert.deepEqual(tree.map((node) => node.agent.id), ["main", "lost"])
    const depth = (node) => 1 + Math.max(0, ...node.children.map(depth))
    assert.equal(depth(tree[0]), 4)
})

test("estimateCost prices tokens at output rates", () => {
    assert.equal(estimateCost([{ model: "opus", tokens: 1e6 }, { model: "haiku", tokens: 2e6 }]), 21)
    assert.equal(estimateCost([{ model: "sonnet" }]), 0)
})

test("countRunning leaves the main session out of the limits", () => {
    const agents = [
        { role: "main", model: "opus", status: "running", updatedAt: ago(1000) },
        { role: "coordinator", model: "opus", status: "running", updatedAt: ago(1000) },
    ]
    assert.deepEqual(countRunning(agents, now), { opus: 1, sonnet: 0, haiku: 0 })
})

test("countRunning leaves the scribe out of the limits", () => {
    const agents = [{ role: "scribe", model: "opus", status: "running", updatedAt: ago(1000) }]
    assert.deepEqual(countRunning(agents, now), { opus: 0, sonnet: 0, haiku: 0 })
})
