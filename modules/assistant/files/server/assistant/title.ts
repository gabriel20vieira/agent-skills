import { TITLE_TIMEOUT_MS } from "#shared/utils/assistant"
import type { ChatProvider } from "./provider"

/**
 * A short title for a new conversation, written by the model in the language of the first
 * message. Null when the model fails or is too slow: the conversation keeps its fallback
 * title (the start of the first message).
 */
export async function generateTitle(provider: ChatProvider, firstMessage: string, signal: AbortSignal): Promise<string | null> {
    try {
        const answer = await provider.complete({
            signal: AbortSignal.any([signal, AbortSignal.timeout(TITLE_TIMEOUT_MS)]),
            messages: [
                {
                    role: "system",
                    content: "Write a title of at most 5 words for a conversation that starts with the user's message. Use the same language as the message. Answer with the title only: no quotes, no final period.",
                },
                { role: "user", content: firstMessage.slice(0, 2000) },
            ],
        })
        const title = answer.replace(/["“”«»]/g, "").replace(/\s+/g, " ").trim().replace(/\.$/, "")
        return title ? title.slice(0, 80) : null
    }
    catch {
        return null
    }
}
