import { randomUUID } from "node:crypto"
import type { ChatChunk, ChatMessage, ChatProvider, ToolSpec } from "../provider"
import { parseOllamaLine, toOllama } from "./ollamaStream"

// Models that rejected `think: true` (no reasoning support): asked without it from then on.
const noThink = new Set<string>()

/** Ollama's /api/chat with streaming (NDJSON), native tool calling and reasoning (`think`). */
export function createOllamaProvider(options: { baseUrl: string, model: string }): ChatProvider {
    const endpoint = `${options.baseUrl.replace(/\/$/, "")}/api/chat`
    const post = (body: Record<string, unknown>, signal: AbortSignal) => fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        signal,
        body: JSON.stringify({ model: options.model, ...body }),
    })

    return {
        async* chat({ messages, tools, signal }: { messages: ChatMessage[], tools: ToolSpec[], signal: AbortSignal }): AsyncIterable<ChatChunk> {
            const body = { stream: true, messages: toOllama(messages), tools: tools.map(tool => ({ type: "function", function: tool })) }
            const think = !noThink.has(options.model)
            let response = await post(think ? { ...body, think: true } : body, signal)
            if (think && response.status === 400) {
                const detail = await response.text().catch(() => "")
                if (!/think/i.test(detail)) throw fail(502, "assistant.provider_error", `Ollama answered 400: ${detail.slice(0, 200)}`)
                noThink.add(options.model)
                response = await post(body, signal)
            }
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
                    try {
                        yield* parseOllamaLine(line, randomUUID)
                    }
                    catch (error) {
                        throw fail(502, "assistant.provider_error", (error as Error).message)
                    }
                }
            }
        },

        async complete({ messages, signal }) {
            const response = await post({ stream: false, messages: toOllama(messages) }, signal)
            if (!response.ok) throw fail(502, "assistant.provider_error", `Ollama answered ${response.status}`)
            const data = await response.json() as { message?: { content?: string } }
            return data.message?.content ?? ""
        },
    }
}
