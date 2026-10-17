import { createAnthropicProvider } from "./providers/anthropic"
import { createFakeProvider } from "./providers/fake"
import { createOllamaProvider } from "./providers/ollama"

export interface ToolCall {
    id: string
    name: string
    arguments: Record<string, unknown>
}

export interface ChatMessage {
    role: "system" | "user" | "assistant" | "tool"
    content: string
    toolCalls?: ToolCall[]
    toolCallId?: string
    /**
     * The provider's own blocks for an assistant turn produced in this request (Anthropic
     * keeps its thinking blocks valid this way). Never stored; replayed only within the turn.
     */
    raw?: unknown
}

/** What the model sees of a tool: JSON Schema parameters, never the implementation. */
export interface ToolSpec {
    name: string
    description: string
    parameters: Record<string, unknown>
}

export type ChatChunk
    = | { type: "thinking", text: string }
        | { type: "text", text: string }
        | { type: "tool_calls", calls: ToolCall[] }
        | { type: "raw", raw: unknown }

/** One model backend. Add providers (OpenAI-compatible, ...) behind this. */
export interface ChatProvider {
    /** Streams one model call: reasoning, text, tool calls, and (optionally) the raw turn. */
    chat(input: { messages: ChatMessage[], tools: ToolSpec[], signal: AbortSignal }): AsyncIterable<ChatChunk>
    /** One short answer without tools (conversation titles). */
    complete(input: { messages: ChatMessage[], signal: AbortSignal }): Promise<string>
}

export async function getChatProvider(): Promise<ChatProvider> {
    const provider = await getSetting("assistant.provider")
    if (provider === "fake") return createFakeProvider()
    if (provider === "anthropic") {
        // The key lives in the server environment only, never in settings or the database.
        return createAnthropicProvider({ apiKey: process.env.ANTHROPIC_API_KEY ?? "", model: await getSetting("assistant.anthropicModel") })
    }
    return createOllamaProvider({
        baseUrl: await getSetting("assistant.baseUrl"),
        model: await getSetting("assistant.model"),
    })
}
