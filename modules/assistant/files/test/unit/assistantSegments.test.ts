import { describe, expect, it } from "vitest"
import type { AssistantSegment } from "#shared/utils/assistant"
import { applyEvent, groupSegments, normalizeChart, THINKING_MAX_CHARS } from "#shared/utils/assistant"

const proposal = { id: 7, tool: "propose_note", summary: "New note", state: "pending" as const, request: { method: "POST" as const, url: "/api/notes" } }

describe("applyEvent", () => {
    it("merges consecutive deltas and records reasoning times", () => {
        const segments: AssistantSegment[] = []
        applyEvent(segments, { type: "thinking", text: "Let me " }, 10)
        applyEvent(segments, { type: "thinking", text: "check." }, 900)
        applyEvent(segments, { type: "text", text: "Hello" }, 950)
        applyEvent(segments, { type: "text", text: " there" }, 960)
        expect(segments).toEqual([
            { type: "thinking", text: "Let me check.", start: 10, end: 900 },
            { type: "text", text: "Hello there" },
        ])
    })

    it("closes the tool that finished and records proposals and charts in order", () => {
        const segments: AssistantSegment[] = []
        applyEvent(segments, { type: "tool", name: "list_notes", status: "running" }, 100)
        applyEvent(segments, { type: "tool", name: "list_notes", status: "done" }, 400)
        applyEvent(segments, { type: "proposal", proposal }, 500)
        applyEvent(segments, { type: "chart", chart: { type: "bar", title: "T", categories: [], series: [] } }, 600)
        expect(segments).toEqual([
            { type: "tool", name: "list_notes", start: 100, end: 400, done: true },
            { type: "proposal", id: 7 },
            { type: "chart", chart: { type: "bar", title: "T", categories: [], series: [] } },
        ])
    })

    it("stops storing reasoning past the cap", () => {
        const segments: AssistantSegment[] = []
        applyEvent(segments, { type: "thinking", text: "x".repeat(THINKING_MAX_CHARS - 2) }, 0)
        applyEvent(segments, { type: "text", text: "a" }, 1)
        applyEvent(segments, { type: "thinking", text: "yyyy" }, 2)
        const stored = segments.filter(segment => segment.type === "thinking").map(segment => segment.text).join("")
        expect(stored.length).toBe(THINKING_MAX_CHARS)
    })
})

describe("groupSegments", () => {
    it("puts consecutive reasoning and tools in one block and drops empty text", () => {
        const groups = groupSegments([
            { type: "thinking", text: "a", start: 0, end: 1 },
            { type: "tool", name: "list_notes", start: 1, end: 2, done: true },
            { type: "text", text: "  " },
            { type: "text", text: "Answer" },
            { type: "proposal", id: 1 },
            { type: "thinking", text: "b", start: 3, end: 4 },
        ])
        expect(groups.map(group => group.kind)).toEqual(["think", "segment", "segment", "think"])
        expect(groups[0]).toMatchObject({ kind: "think", items: [{ type: "thinking" }, { type: "tool" }] })
    })
})

describe("normalizeChart", () => {
    it("aligns series to categories and replaces bad numbers", () => {
        const chart = normalizeChart({
            type: "nope" as never,
            title: "Notes",
            categories: ["Jan", "Feb", "Mar"],
            series: [{ name: "Notes", data: [1, Number.NaN] }],
            unit: "€",
        })
        expect(chart).toEqual({ type: "column", title: "Notes", categories: ["Jan", "Feb", "Mar"], series: [{ name: "Notes", data: [1, 0, 0] }], unit: "€" })
    })
})
