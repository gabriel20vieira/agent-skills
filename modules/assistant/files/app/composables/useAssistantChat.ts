import type { AssistantProposal, AssistantStreamEvent } from "#shared/utils/assistant"

export interface ChatLine {
    key: string
    role: "user" | "assistant"
    content: string
}

interface ConversationView {
    id: number
    title: string
    messages: { id: number, role: "user" | "assistant" | "system", content: string }[]
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
 * One assistant conversation: send messages (streamed), and accept or reject the
 * proposal cards. Accepting = claim -> the normal REST call -> settle.
 */
export function useAssistantChat() {
    const api = useApi()
    const errorMessage = useErrorMessage()
    const { t } = useI18n()

    const conversationId = ref<number | null>(null)
    const lines = ref<ChatLine[]>([])
    const proposals = ref<AssistantProposal[]>([])
    const streaming = ref(false)
    const activeTool = ref<string | null>(null)
    const error = ref("")
    let controller: AbortController | null = null

    function reset() {
        controller?.abort()
        conversationId.value = null
        lines.value = []
        proposals.value = []
        error.value = ""
    }

    async function load(id: number) {
        reset()
        const view = await api<ConversationView>(`/api/assistant/conversations/${id}`)
        conversationId.value = view.id
        lines.value = view.messages
            .filter(message => message.role !== "system")
            .map(message => ({ key: `m${message.id}`, role: message.role as ChatLine["role"], content: message.content }))
        proposals.value = view.proposals
    }

    async function send(text: string) {
        if (streaming.value || !text.trim()) return
        error.value = ""
        streaming.value = true
        lines.value.push({ key: `u${Date.now()}`, role: "user", content: text })
        const reply = reactive<ChatLine>({ key: `a${Date.now()}`, role: "assistant", content: "" })
        lines.value.push(reply)
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
                else if (event.type === "text") reply.content += event.text
                else if (event.type === "tool") activeTool.value = event.name
                else if (event.type === "proposal") proposals.value.push(event.proposal)
                else if (event.type === "error") error.value = errorMessage({ data: { code: event.code } })
            }
        }
        catch (caught) {
            if ((caught as Error)?.name !== "AbortError") error.value = errorMessage(caught)
        }
        finally {
            if (!reply.content) lines.value = lines.value.filter(line => line.key !== reply.key)
            streaming.value = false
            activeTool.value = null
            controller = null
        }
    }

    function stop() {
        controller?.abort()
    }

    function update(proposal: AssistantProposal, state: AssistantProposal["state"]) {
        const index = proposals.value.findIndex(item => item.id === proposal.id)
        if (index >= 0) proposals.value[index] = { ...proposals.value[index]!, state }
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

    return { conversationId, lines, proposals, streaming, activeTool, error, reset, load, send, stop, accept, reject }
}
