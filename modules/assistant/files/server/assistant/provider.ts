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
}

/** What the model sees of a tool: JSON Schema parameters, never the implementation. */
export interface ToolSpec {
    name: string
    description: string
    parameters: Record<string, unknown>
}

export type ChatChunk = { type: "text", text: string } | { type: "tool_calls", calls: ToolCall[] }

/** One model backend. Add providers (OpenAI-compatible, Anthropic, ...) behind this. */
export interface ChatProvider {
    chat(input: { messages: ChatMessage[], tools: ToolSpec[], signal: AbortSignal }): AsyncIterable<ChatChunk>
}

export async function getChatProvider(): Promise<ChatProvider> {
    const provider = await getSetting("assistant.provider")
    if (provider === "fake") return createFakeProvider()
    return createOllamaProvider({
        baseUrl: await getSetting("assistant.baseUrl"),
        model: await getSetting("assistant.model"),
    })
}
