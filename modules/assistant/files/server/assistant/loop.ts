import type { AssistantStreamEvent } from "#shared/utils/assistant"
import { ASSISTANT_MAX_ITERATIONS, ASSISTANT_TIMEOUT_MS } from "#shared/utils/assistant"
import { appendMessage, createProposal, loadTranscript, toProposal } from "../services/assistant"
import type { ToolContext } from "./defineTool"
import { toolSpec } from "./defineTool"
import type { ChatMessage, ChatProvider, ToolCall } from "./provider"
import { toolsFor } from "./registry"

const BASE_PROMPT = [
    "You are the assistant of this web application.",
    "Use the tools to read data; never invent records.",
    "You cannot change data yourself: to create, change or delete something, call a propose_* tool.",
    "The user will see a card and decide. Say briefly what you proposed.",
    "Answer in the user's language.",
].join(" ")

/**
 * One assistant turn: model -> tools -> model ..., at most ASSISTANT_MAX_ITERATIONS model
 * calls and ASSISTANT_TIMEOUT_MS overall. Tools are filtered by permission when offered
 * and checked again when called.
 */
export async function runAssistantTurn(input: {
    ctx: ToolContext
    provider: ChatProvider
    conversationId: number
    systemPrompt: string
    signal: AbortSignal
    emit: (event: AssistantStreamEvent) => Promise<void>
}) {
    const { ctx, provider, conversationId, emit } = input
    const tools = toolsFor(ctx.user)
    const specs = [...tools.values()].map(toolSpec)
    const timeout = AbortSignal.timeout(ASSISTANT_TIMEOUT_MS)
    const signal = AbortSignal.any([input.signal, timeout])
    const system: ChatMessage = { role: "system", content: [BASE_PROMPT, input.systemPrompt].filter(Boolean).join("\n\n") }

    for (let iteration = 0; iteration < ASSISTANT_MAX_ITERATIONS; iteration++) {
        const transcript = await loadTranscript(conversationId)
        let text = ""
        const calls: ToolCall[] = []
        for await (const chunk of provider.chat({ messages: [system, ...transcript], tools: specs, signal })) {
            if (chunk.type === "text") {
                text += chunk.text
                await emit({ type: "text", text: chunk.text })
            }
            else {
                calls.push(...chunk.calls)
            }
        }
        await appendMessage(conversationId, { role: "assistant", content: text, toolCalls: calls })
        if (!calls.length) return

        for (const call of calls) {
            const result = await runTool(ctx, tools, call, conversationId, emit)
            await appendMessage(conversationId, { role: "tool", content: JSON.stringify(result), toolCallId: call.id })
        }
    }
    await emit({ type: "error", code: "assistant.too_many_steps" })
}

async function runTool(
    ctx: ToolContext,
    tools: ReturnType<typeof toolsFor>,
    call: ToolCall,
    conversationId: number,
    emit: (event: AssistantStreamEvent) => Promise<void>,
): Promise<unknown> {
    const tool = tools.get(call.name)
    // Not offered, or the user's roles changed mid-conversation: refuse.
    if (!tool || !can(ctx.user.effectiveRoles, ...tool.permission)) {
        return { error: "tool_not_available", tool: call.name }
    }
    const parsed = tool.parameters.safeParse(call.arguments)
    if (!parsed.success) {
        return { error: "invalid_arguments", issues: parsed.error.issues.map(issue => ({ path: issue.path.join("."), message: issue.message })) }
    }
    await emit({ type: "tool", name: tool.name })
    try {
        if (tool.kind === "read") return await tool.run(ctx, parsed.data)
        const { summary, request } = await tool.propose(ctx, parsed.data)
        const row = await createProposal({
            conversationId,
            userId: ctx.user.id,
            tool: tool.name,
            args: parsed.data as Record<string, unknown>,
            summary,
            request,
        })
        await emit({ type: "proposal", proposal: toProposal(row) })
        return { proposalId: row.id, status: "waiting_for_user" }
    }
    catch (error) {
        const code = (error as { data?: { code?: string } })?.data?.code ?? "tool_failed"
        return { error: code }
    }
}
