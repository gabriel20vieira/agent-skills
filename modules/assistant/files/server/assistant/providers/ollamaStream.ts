import type { ChatChunk, ChatMessage, ToolCall } from "../provider"

export interface OllamaLine {
    message?: {
        content?: string
        thinking?: string
        tool_calls?: { function: { name: string, arguments: Record<string, unknown> | string } }[]
    }
    done?: boolean
    error?: string
}

/** The messages Ollama's /api/chat expects (raw provider blocks never go to Ollama). */
export function toOllama(messages: ChatMessage[]) {
    return messages.map(message => ({
        role: message.role,
        content: message.content,
        ...(message.toolCalls?.length
            ? { tool_calls: message.toolCalls.map(call => ({ function: { name: call.name, arguments: call.arguments } })) }
            : {}),
    }))
}

/**
 * Turns one NDJSON line of a streamed /api/chat reply into chunks. Throws the line's error
 * text when Ollama reports one. `newId` names tool calls (Ollama gives them no id).
 */
export function parseOllamaLine(line: string, newId: () => string): ChatChunk[] {
    const data = JSON.parse(line) as OllamaLine
    if (data.error) throw new Error(data.error)
    const chunks: ChatChunk[] = []
    if (data.message?.thinking) chunks.push({ type: "thinking", text: data.message.thinking })
    if (data.message?.content) chunks.push({ type: "text", text: data.message.content })
    if (data.message?.tool_calls?.length) {
        const calls: ToolCall[] = data.message.tool_calls.map(call => ({
            id: newId(),
            name: call.function.name,
            arguments: typeof call.function.arguments === "string"
                ? JSON.parse(call.function.arguments) as Record<string, unknown>
                : call.function.arguments,
        }))
        chunks.push({ type: "tool_calls", calls })
    }
    return chunks
}
