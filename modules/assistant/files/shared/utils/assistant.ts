/** What POST /api/assistant/chat streams (one JSON object per SSE `data:` line). */
export type AssistantStreamEvent
    = | { type: "conversation", id: number }
        | { type: "text", text: string }
        | { type: "tool", name: string }
        | { type: "proposal", proposal: AssistantProposal }
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

export interface AssistantMessageView {
    id: number
    role: "user" | "assistant" | "system"
    content: string
    createdAt: string
}

/** Loop limits (spec: at most 6 model turns and 120 s per request). */
export const ASSISTANT_MAX_ITERATIONS = 6
export const ASSISTANT_TIMEOUT_MS = 120_000
