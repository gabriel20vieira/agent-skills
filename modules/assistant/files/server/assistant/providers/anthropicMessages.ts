import type Anthropic from "@anthropic-ai/sdk"
import type { ChatMessage, ToolSpec } from "../provider"

type Block = Anthropic.Beta.BetaContentBlockParam
type Param = Anthropic.Beta.BetaMessageParam

// Tool-use ids must match ^[a-zA-Z0-9_-]+$; anything else gets a stable replacement.
const ID = /^[\w-]{1,64}$/

/**
 * The transcript as Messages API params. Rules:
 * - Leading system messages become the top-level `system`; later ones (notes the app adds
 *   after a proposal is settled) become text in the next user turn.
 * - An assistant turn produced in this request is replayed from its raw blocks, so its
 *   thinking stays valid; earlier turns go back as text and tool_use only (their thinking
 *   was produced in another request and must not be replayed).
 * - Tool results pair with tool_use ids; a tool_use left without a result is closed with an
 *   error result, and a result without a tool_use is dropped.
 */
export function toAnthropic(messages: ChatMessage[]): { system: string, messages: Param[] } {
    let start = 0
    while (messages[start]?.role === "system") start++
    const system = messages.slice(0, start).map(message => message.content).join("\n\n")
    const out: Param[] = []
    let open: string[] = []
    const ids = new Map<string, string>()
    let counter = 0
    const idFor = (id: string) => {
        if (ID.test(id)) return id
        if (!ids.has(id)) ids.set(id, `call_${++counter}`)
        return ids.get(id)!
    }

    const pushUser = (blocks: Block[]) => {
        const last = out.at(-1)
        if (last?.role === "user" && Array.isArray(last.content)) (last.content as Block[]).push(...blocks)
        else out.push({ role: "user", content: blocks })
    }
    const closeOpen = () => {
        if (!open.length) return
        pushUser(open.map(id => ({ type: "tool_result", tool_use_id: id, content: "Interrupted.", is_error: true })))
        open = []
    }

    for (const message of messages.slice(start)) {
        if (message.role === "tool") {
            const id = message.toolCallId ? idFor(message.toolCallId) : undefined
            if (!id || !open.includes(id)) continue
            open = open.filter(item => item !== id)
            pushUser([{ type: "tool_result", tool_use_id: id, content: message.content || "{}" }])
            continue
        }
        closeOpen()
        if (message.role === "system") {
            pushUser([{ type: "text", text: `Note from the app: ${message.content}` }])
            continue
        }
        if (message.role === "user") {
            pushUser([{ type: "text", text: message.content }])
            continue
        }
        // The first turn must be a user one.
        if (!out.length) continue
        if (Array.isArray(message.raw)) {
            const blocks = message.raw as Block[]
            out.push({ role: "assistant", content: blocks })
            open = blocks.filter(block => block.type === "tool_use").map(block => (block as Anthropic.Beta.BetaToolUseBlockParam).id)
            continue
        }
        const blocks: Block[] = []
        if (message.content) blocks.push({ type: "text", text: message.content })
        for (const call of message.toolCalls ?? []) {
            const id = idFor(call.id)
            blocks.push({ type: "tool_use", id, name: call.name, input: call.arguments ?? {} })
            open.push(id)
        }
        if (blocks.length) out.push({ role: "assistant", content: blocks })
    }
    closeOpen()
    return { system, messages: out }
}

export function toAnthropicTools(tools: ToolSpec[]): Anthropic.Beta.BetaTool[] {
    return tools.map(tool => ({
        name: tool.name,
        description: tool.description,
        input_schema: tool.parameters as Anthropic.Beta.BetaTool.InputSchema,
        // Streams large inputs as generated; the loop validates every input with zod.
        eager_input_streaming: true,
    }))
}
