import { randomUUID } from "node:crypto"
import type { ChatChunk, ChatMessage, ChatProvider, ToolSpec } from "../provider"

interface OllamaLine {
    message?: {
        content?: string
        tool_calls?: { function: { name: string, arguments: Record<string, unknown> | string } }[]
    }
    done?: boolean
    error?: string
}

function toOllama(messages: ChatMessage[]) {
    return messages.map(message => ({
        role: message.role,
        content: message.content,
        ...(message.toolCalls?.length
            ? { tool_calls: message.toolCalls.map(call => ({ function: { name: call.name, arguments: call.arguments } })) }
            : {}),
    }))
}

/** Ollama's /api/chat with streaming (NDJSON) and native tool calling. */
export function createOllamaProvider(options: { baseUrl: string, model: string }): ChatProvider {
    return {
        async* chat({ messages, tools, signal }: { messages: ChatMessage[], tools: ToolSpec[], signal: AbortSignal }): AsyncIterable<ChatChunk> {
            const response = await fetch(`${options.baseUrl.replace(/\/$/, "")}/api/chat`, {
                method: "POST",
                headers: { "content-type": "application/json" },
                signal,
                body: JSON.stringify({
                    model: options.model,
                    stream: true,
                    messages: toOllama(messages),
                    tools: tools.map(tool => ({ type: "function", function: tool })),
                }),
            })
            if (!response.ok || !response.body) throw fail(502, "assistant.provider_error", `Ollama answered ${response.status}`)

            const decoder = new TextDecoder()
            let buffer = ""
            for await (const part of response.body as unknown as AsyncIterable<Uint8Array>) {
                buffer += decoder.decode(part, { stream: true })
                let newline: number
                while ((newline = buffer.indexOf("\n")) >= 0) {
                    const line = buffer.slice(0, newline).trim()
                    buffer = buffer.slice(newline + 1)
                    if (!line) continue
                    const data = JSON.parse(line) as OllamaLine
                    if (data.error) throw fail(502, "assistant.provider_error", data.error)
                    if (data.message?.content) yield { type: "text", text: data.message.content }
                    if (data.message?.tool_calls?.length) {
                        yield {
                            type: "tool_calls",
                            calls: data.message.tool_calls.map(call => ({
                                id: randomUUID(),
                                name: call.function.name,
                                arguments: typeof call.function.arguments === "string"
                                    ? JSON.parse(call.function.arguments) as Record<string, unknown>
                                    : call.function.arguments,
                            })),
                        }
                    }
                }
            }
        },
    }
}
