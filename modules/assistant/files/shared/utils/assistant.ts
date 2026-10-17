/** What POST /api/assistant/chat streams (one JSON object per SSE `data:` line). */
export type AssistantStreamEvent
    = | { type: "conversation", id: number }
        | { type: "thinking", text: string }
        | { type: "text", text: string }
        | { type: "tool", name: string, status: "running" | "done" }
        | { type: "proposal", proposal: AssistantProposal }
        | { type: "chart", chart: AssistantChart }
        | { type: "title", id: number, title: string }
        | { type: "error", code: string }
        | { type: "done" }

export const PROPOSAL_STATES = ["pending", "claimed", "done", "rejected", "failed"] as const
export type ProposalState = (typeof PROPOSAL_STATES)[number]

/** A write the assistant suggests; the user runs it through the normal REST API. */
export interface AssistantProposal {
    id: number
    tool: string
    summary: string
    state: ProposalState
    request: { method: "POST" | "PATCH" | "DELETE", url: string, body?: unknown }
}

export const CHART_TYPES = ["column", "bar", "line", "area", "stacked", "donut", "radar", "table"] as const
export type ChartType = (typeof CHART_TYPES)[number]

/** A chart computed on the server by a chart tool. The model never supplies the numbers. */
export interface AssistantChart {
    type: ChartType
    title: string
    categories: string[]
    series: { name: string, data: number[] }[]
    /** Shown after each value, e.g. "€" or "%". */
    unit?: string
}

/**
 * One piece of an assistant reply, in the order it happened. Times are milliseconds since
 * the request started, so "Thought for N s" survives a reload.
 */
export type AssistantSegment
    = | { type: "thinking", text: string, start: number, end: number }
        | { type: "text", text: string }
        | { type: "tool", name: string, start: number, end?: number, done: boolean }
        | { type: "proposal", id: number }
        | { type: "chart", chart: AssistantChart }

export interface AssistantMessageView {
    id: number
    role: "user" | "assistant"
    content: string
    /** Assistant replies recorded with segments (older ones only have `content`). */
    segments?: AssistantSegment[]
    createdAt: string
}

/** Loop limits (spec: at most 6 model turns and 120 s per request). */
export const ASSISTANT_MAX_ITERATIONS = 6
export const ASSISTANT_TIMEOUT_MS = 120_000
/** Reasoning kept per reply; the rest is still streamed live but not stored. */
export const THINKING_MAX_CHARS = 4000
export const TITLE_TIMEOUT_MS = 15_000
export const CHART_MAX_CATEGORIES = 60
export const CHART_MAX_SERIES = 10

/** Applies one stream event to a reply's segments (live in the page, recorded on the server). */
export function applyEvent(segments: AssistantSegment[], event: AssistantStreamEvent, at: number): void {
    const last = segments.at(-1)
    if (event.type === "thinking") {
        const stored = segments.reduce((sum, segment) => sum + (segment.type === "thinking" ? segment.text.length : 0), 0)
        const text = event.text.slice(0, Math.max(0, THINKING_MAX_CHARS - stored))
        if (last?.type === "thinking") {
            last.text += text
            last.end = at
        }
        else {
            segments.push({ type: "thinking", text, start: at, end: at })
        }
    }
    else if (event.type === "text") {
        if (last?.type === "text") last.text += event.text
        else segments.push({ type: "text", text: event.text })
    }
    else if (event.type === "tool") {
        if (event.status === "running") {
            segments.push({ type: "tool", name: event.name, start: at, done: false })
            return
        }
        const open = segments.findLast(segment => segment.type === "tool" && segment.name === event.name && !segment.done)
        if (open?.type === "tool") {
            open.done = true
            open.end = at
        }
    }
    else if (event.type === "proposal") {
        segments.push({ type: "proposal", id: event.proposal.id })
    }
    else if (event.type === "chart") {
        segments.push({ type: "chart", chart: event.chart })
    }
}

export type SegmentGroup
    = | { kind: "think", items: Extract<AssistantSegment, { type: "thinking" | "tool" }>[] }
        | { kind: "segment", segment: Exclude<AssistantSegment, { type: "thinking" | "tool" }> }

/** Consecutive reasoning and tool steps render as one collapsible block; the rest stands alone. */
export function groupSegments(segments: AssistantSegment[]): SegmentGroup[] {
    const groups: SegmentGroup[] = []
    for (const segment of segments) {
        if (segment.type === "thinking" || segment.type === "tool") {
            const last = groups.at(-1)
            if (last?.kind === "think") last.items.push(segment)
            else groups.push({ kind: "think", items: [segment] })
        }
        else if (segment.type !== "text" || segment.text.trim()) {
            groups.push({ kind: "segment", segment })
        }
    }
    return groups
}

/**
 * Cleans a chart a tool built: known type, bounded sizes, finite numbers, one value per
 * category in every series (missing values become 0).
 */
export function normalizeChart(input: AssistantChart): AssistantChart {
    const type = (CHART_TYPES as readonly string[]).includes(input.type) ? input.type : "column"
    const categories = input.categories.slice(0, CHART_MAX_CATEGORIES).map(category => String(category).slice(0, 80))
    const series = input.series.slice(0, CHART_MAX_SERIES).map(item => ({
        name: String(item.name).slice(0, 80),
        data: categories.map((_, index) => {
            const value = Number(item.data[index])
            return Number.isFinite(value) ? value : 0
        }),
    }))
    return {
        type,
        title: String(input.title).slice(0, 120),
        categories,
        series,
        ...(input.unit ? { unit: String(input.unit).slice(0, 12) } : {}),
    }
}
