import { runAssistantTurn } from "../../assistant/loop"
import { getChatProvider } from "../../assistant/provider"
import { generateTitle } from "../../assistant/title"
import { toolContext } from "../../assistant/defineTool"
import { appendMessage, createConversation, getOwnConversation, setTitle } from "../../services/assistant"
import { assistantChatSchema } from "#shared/schemas/assistant"
import type { AssistantStreamEvent } from "#shared/utils/assistant"

/** Streams one assistant turn as server-sent events (one JSON AssistantStreamEvent per message). */
export default defineEventHandler(async (event) => {
    const user = requireUser(event)
    if (!(await getSetting("assistant.enabled"))) throw fail(503, "assistant.disabled")
    assertPermission(user, "assistant", "read")
    const body = await readBodyWith(event, assistantChatSchema)

    const isNew = !body.conversationId
    const conversationId = body.conversationId
        ? (await getOwnConversation(user.id, body.conversationId)).id
        : await createConversation(user.id, body.message)
    await appendMessage(conversationId, { role: "user", content: body.message })
    const provider = await getChatProvider()
    const systemPrompt = await getSetting("assistant.systemPrompt")

    // Proxies must pass each event through as it is written (nginx honours this header).
    setResponseHeader(event, "X-Accel-Buffering", "no")
    const stream = createEventStream(event)
    const controller = new AbortController()
    stream.onClosed(() => controller.abort())
    const emit = (message: AssistantStreamEvent) => stream.push(JSON.stringify(message))

    void (async () => {
        try {
            await emit({ type: "conversation", id: conversationId })
            await runAssistantTurn({ ctx: toolContext(event, user), provider, conversationId, systemPrompt, signal: controller.signal, emit })
            if (isNew) {
                const title = await generateTitle(provider, body.message, controller.signal)
                if (title) {
                    await setTitle(conversationId, title)
                    await emit({ type: "title", id: conversationId, title })
                }
            }
        }
        catch (error) {
            if (!controller.signal.aborted) {
                const timedOut = (error as Error)?.name === "TimeoutError"
                const code = timedOut ? "assistant.timeout" : ((error as { data?: { code?: string } })?.data?.code ?? "assistant.failed")
                await emit({ type: "error", code }).catch(() => {})
            }
        }
        finally {
            await emit({ type: "done" }).catch(() => {})
            await stream.close()
        }
    })()

    return stream.send()
})
