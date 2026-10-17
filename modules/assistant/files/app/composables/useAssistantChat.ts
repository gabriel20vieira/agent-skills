import type { AssistantMessageView, AssistantProposal, AssistantSegment, AssistantStreamEvent } from "#shared/utils/assistant"
import { applyEvent } from "#shared/utils/assistant"

/** One bubble in the page: a user message, or an assistant reply made of segments. */
export interface ChatEntry {
    key: string
    role: "user" | "assistant"
    content: string
    segments: AssistantSegment[]
    /** Live only: while the reply streams, and the wall-clock time it was sent. */
    streaming?: boolean
    sentAt?: number
}

interface ConversationView {
    id: number
    title: string
    messages: AssistantMessageView[]
    proposals: AssistantProposal[]
}

/** Reads a server-sent-events body and yields each `data:` payload as JSON. */
async function* readEvents(body: ReadableStream<Uint8Array>): AsyncGenerator<AssistantStreamEvent> {
    const reader = body.getReader()
    const decoder = new TextDecoder()
    let buffer = ""
    for (;;) {
        const { value, done } = await reader.read()
        if (done) return
        buffer += decoder.decode(value, { stream: true })
        let end: number
        while ((end = buffer.indexOf("\n\n")) >= 0) {
            const block = buffer.slice(0, end)
            buffer = buffer.slice(end + 2)
            const data = block.split("\n").filter(line => line.startsWith("data:")).map(line => line.slice(5).trimStart()).join("\n")
            if (data) yield JSON.parse(data) as AssistantStreamEvent
        }
    }
}

/**
 * One assistant conversation: send messages (streamed as reasoning, text, tool steps,
 * proposal cards and charts), and accept or reject the cards. Accepting = claim -> the
 * normal REST call -> settle.
 */
export function useAssistantChat(options: { onTitle?: (id: number, title: string) => void } = {}) {
    const api = useApi()
    const errorMessage = useErrorMessage()
    const { t } = useI18n()

    const conversationId = ref<number | null>(null)
    const entries = ref<ChatEntry[]>([])
    const proposals = ref<Record<number, AssistantProposal>>({})
    const streaming = ref(false)
    const error = ref("")
    let controller: AbortController | null = null

    function reset() {
        controller?.abort()
        conversationId.value = null
        entries.value = []
        proposals.value = {}
        error.value = ""
    }

    async function load(id: number) {
        reset()
        const view = await api<ConversationView>(`/api/assistant/conversations/${id}`)
        conversationId.value = view.id
        entries.value = view.messages.map(message => ({
            key: `m${message.id}`,
            role: message.role,
            content: message.content,
            segments: message.segments ?? (message.role === "assistant" ? [{ type: "text", text: message.content }] : []),
        }))
        proposals.value = Object.fromEntries(view.proposals.map(proposal => [proposal.id, proposal]))
    }

    async function send(text: string) {
        if (streaming.value || !text.trim()) return
        error.value = ""
        streaming.value = true
        entries.value.push({ key: `u${Date.now()}`, role: "user", content: text, segments: [] })
        const reply = reactive<ChatEntry>({ key: `a${Date.now()}`, role: "assistant", content: "", segments: [], streaming: true, sentAt: Date.now() })
        entries.value.push(reply)
        controller = new AbortController()
        try {
            const response = await fetch("/api/assistant/chat", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ conversationId: conversationId.value ?? undefined, message: text }),
                signal: controller.signal,
            })
            if (!response.ok || !response.body) {
                const body = await response.json().catch(() => null)
                throw { data: body?.data, statusCode: response.status }
            }
            for await (const event of readEvents(response.body)) {
                if (event.type === "conversation") conversationId.value = event.id
                else if (event.type === "proposal") proposals.value[event.proposal.id] = event.proposal
                else if (event.type === "title") options.onTitle?.(event.id, event.title)
                else if (event.type === "error") error.value = errorMessage({ data: { code: event.code } })
                applyEvent(reply.segments, event, Date.now() - reply.sentAt!)
                if (event.type === "text") reply.content += event.text
            }
        }
        catch (caught) {
            if ((caught as Error)?.name !== "AbortError") error.value = errorMessage(caught)
        }
        finally {
            reply.streaming = false
            if (!reply.segments.length) entries.value = entries.value.filter(entry => entry.key !== reply.key)
            streaming.value = false
            controller = null
        }
    }

    function stop() {
        controller?.abort()
    }

    function update(proposal: AssistantProposal, state: AssistantProposal["state"]) {
        proposals.value[proposal.id] = { ...proposal, state }
    }

    async function accept(proposal: AssistantProposal) {
        const claimed = await api<AssistantProposal>(`/api/assistant/proposals/${proposal.id}/claim`, { method: "POST" })
        update(proposal, "claimed")
        let result: { ok: boolean, resultId?: number | string, error?: string }
        try {
            const response = await api<{ id?: number | string } | null>(claimed.request.url, {
                method: claimed.request.method,
                body: claimed.request.body as Record<string, unknown> | undefined,
            })
            result = { ok: true, resultId: response?.id }
        }
        catch (caught) {
            result = { ok: false, error: extractApiError(caught).code }
        }
        const settled = await api<{ state: AssistantProposal["state"] }>(`/api/assistant/proposals/${proposal.id}/settle`, { method: "POST", body: result })
        update(proposal, settled.state)
        return settled.state === "done" ? t("assistant.proposal.done") : t("assistant.proposal.failed")
    }

    async function reject(proposal: AssistantProposal) {
        await api(`/api/assistant/proposals/${proposal.id}/reject`, { method: "POST" })
        update(proposal, "rejected")
    }

    return { conversationId, entries, proposals, streaming, error, reset, load, send, stop, accept, reject }
}
