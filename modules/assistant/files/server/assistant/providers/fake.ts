import type { ChatChunk, ChatMessage, ChatProvider, ToolSpec } from "../provider"

/**
 * A scripted model for tests and demos (setting assistant.provider = "fake"). Never use it
 * in production. It "thinks" before every answer. Commands in the last user message:
 * - "list notes"            -> calls list_notes, then summarises the result
 * - "propose note: <title>" -> calls propose_note
 * - "chart notes"           -> calls chart_notes_by_month
 * - anything else           -> echoes the message
 */
export function createFakeProvider(): ChatProvider {
    return {
        async* chat({ messages, tools }: { messages: ChatMessage[], tools: ToolSpec[], signal: AbortSignal }): AsyncIterable<ChatChunk> {
            yield { type: "thinking", text: "Reading the request. " }
            yield { type: "thinking", text: "Deciding what to do." }
            const last = messages.at(-1)
            if (last?.role === "tool") {
                yield { type: "text", text: "Tool result: " }
                yield { type: "text", text: last.content.slice(0, 500) }
                return
            }
            const text = [...messages].reverse().find(message => message.role === "user")?.content ?? ""
            const offered = new Set(tools.map(tool => tool.name))
            // Asks for the tool even when it was not offered: the loop must refuse it.
            if (/^list notes/i.test(text)) {
                yield { type: "tool_calls", calls: [{ id: "call-1", name: "list_notes", arguments: {} }] }
                return
            }
            if (/^chart notes/i.test(text)) {
                yield { type: "tool_calls", calls: [{ id: "call-1", name: "chart_notes_by_month", arguments: {} }] }
                return
            }
            const propose = /^propose note:\s*(.+)$/i.exec(text)
            if (propose) {
                yield { type: "tool_calls", calls: [{ id: "call-1", name: "propose_note", arguments: { title: propose[1]!.trim() } }] }
                return
            }
            yield { type: "text", text: "You said: " }
            yield { type: "text", text: `${text} (tools: ${[...offered].sort().join(", ") || "none"})` }
        },

        async complete({ messages }) {
            const text = messages.findLast(message => message.role === "user")?.content ?? ""
            return `Title: ${text.split(/\s+/).slice(-3).join(" ")}`
        },
    }
}
