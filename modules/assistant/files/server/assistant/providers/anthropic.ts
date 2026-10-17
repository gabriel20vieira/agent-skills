import Anthropic from "@anthropic-ai/sdk"
import type { ChatChunk, ChatMessage, ChatProvider, ToolCall, ToolSpec } from "../provider"
import { toAnthropic, toAnthropicTools } from "./anthropicMessages"

// Server-side refusal fallback: on a policy decline the API retries on the model's default
// fallback inside the same call. Models without fallback support run alone.
const FALLBACK_BETA = "server-side-fallback-2026-07-01"
const MAX_TOKENS = 16_000

// Models that rejected adaptive thinking (older ones): asked without it from then on.
const noAdaptive = new Set<string>()

function toFailure(error: unknown) {
    if (error instanceof Anthropic.AuthenticationError || error instanceof Anthropic.PermissionDeniedError) {
        return fail(502, "assistant.not_configured", error.message)
    }
    if (error instanceof Anthropic.RateLimitError) return fail(503, "assistant.busy", error.message)
    if (error instanceof Anthropic.APIError) return fail(502, "assistant.provider_error", `${error.status ?? ""} ${error.message}`.slice(0, 300))
    return error
}

function checkStop(message: Anthropic.Beta.BetaMessage) {
    if (message.stop_reason === "refusal") throw fail(502, "assistant.refused")
    // A cut-off turn may carry a truncated tool input: never run it.
    if (message.stop_reason === "max_tokens" && message.content.some(block => block.type === "tool_use")) {
        throw fail(502, "assistant.cut_off")
    }
}

/**
 * Anthropic Messages API with adaptive thinking. `display: "summarized"` streams a
 * readable summary of the model's reasoning, which the page shows as it arrives.
 */
export function createAnthropicProvider(options: { apiKey: string, model: string }): ChatProvider {
    const client = () => {
        if (!options.apiKey) throw fail(503, "assistant.not_configured", "ANTHROPIC_API_KEY is not set")
        return new Anthropic({ apiKey: options.apiKey })
    }

    return {
        async* chat({ messages, tools, signal }: { messages: ChatMessage[], tools: ToolSpec[], signal: AbortSignal }): AsyncIterable<ChatChunk> {
            const { system, messages: params } = toAnthropic(messages)
            const open = (thinking: boolean) => client().beta.messages.stream({
                model: options.model,
                max_tokens: MAX_TOKENS,
                ...(system ? { system } : {}),
                messages: params,
                ...(tools.length ? { tools: toAnthropicTools(tools) } : {}),
                ...(thinking ? { thinking: { type: "adaptive" as const, display: "summarized" as const } } : {}),
                betas: [FALLBACK_BETA],
                fallbacks: "default",
            }, { signal })

            let thinking = !noAdaptive.has(options.model)
            let stream = open(thinking)
            let final: Anthropic.Beta.BetaMessage
            try {
                for (;;) {
                    try {
                        for await (const event of stream) {
                            if (event.type !== "content_block_delta") continue
                            if (event.delta.type === "thinking_delta") yield { type: "thinking", text: event.delta.thinking }
                            else if (event.delta.type === "text_delta") yield { type: "text", text: event.delta.text }
                        }
                        final = await stream.finalMessage()
                        break
                    }
                    catch (error) {
                        // Rejected before anything streamed, so retrying cannot duplicate output.
                        if (!thinking || !(error instanceof Anthropic.BadRequestError) || !/thinking/i.test(error.message)) throw error
                        noAdaptive.add(options.model)
                        thinking = false
                        stream = open(false)
                    }
                }
            }
            catch (error) {
                throw toFailure(error)
            }
            checkStop(final)

            const calls: ToolCall[] = final.content
                .filter((block): block is Anthropic.Beta.BetaToolUseBlock => block.type === "tool_use")
                .map(block => ({
                    id: block.id,
                    name: block.name,
                    // Eager input streaming skips server-side coercion; only plain objects go on.
                    arguments: block.input && typeof block.input === "object" && !Array.isArray(block.input)
                        ? block.input as Record<string, unknown>
                        : {},
                }))
            yield { type: "raw", raw: final.content }
            if (calls.length) yield { type: "tool_calls", calls }
        },

        async complete({ messages, signal }) {
            const { system, messages: params } = toAnthropic(messages)
            try {
                const message = await client().beta.messages.create({
                    model: options.model,
                    // Room for thinking (always on in newer models) before the short answer.
                    max_tokens: 8000,
                    ...(system ? { system } : {}),
                    messages: params,
                    betas: [FALLBACK_BETA],
                    fallbacks: "default",
                }, { signal })
                checkStop(message)
                return message.content.filter(block => block.type === "text").map(block => (block as Anthropic.Beta.BetaTextBlock).text).join("")
            }
            catch (error) {
                throw toFailure(error)
            }
        },
    }
}
