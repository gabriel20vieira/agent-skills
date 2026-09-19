import { and, asc, desc, eq, inArray } from "drizzle-orm"
import type { AssistantMessageView, AssistantProposal, ProposalState } from "#shared/utils/assistant"
import { assistantConversations, assistantMessages, assistantProposals } from "../db/schema"
import type { ChatMessage, ToolCall } from "../assistant/provider"

export async function listConversations(userId: number) {
    return useDb().select({ id: assistantConversations.id, title: assistantConversations.title, updatedAt: assistantConversations.updatedAt })
        .from(assistantConversations)
        .where(eq(assistantConversations.userId, userId))
        .orderBy(desc(assistantConversations.updatedAt), desc(assistantConversations.id))
        .limit(100)
}

/** Only the owner sees a conversation; anyone else gets 404. */
export async function getOwnConversation(userId: number, id: number) {
    const [row] = await useDb().select().from(assistantConversations)
        .where(and(eq(assistantConversations.id, id), eq(assistantConversations.userId, userId))).limit(1)
    if (!row) throw fail(404, "assistant.not_found")
    return row
}

export async function createConversation(userId: number, firstMessage: string) {
    const title = firstMessage.replace(/\s+/g, " ").slice(0, 80)
    const [result] = await useDb().insert(assistantConversations).values({ userId, title }).$returningId()
    return result!.id
}

export async function deleteConversation(userId: number, id: number) {
    await getOwnConversation(userId, id)
    await useDb().delete(assistantConversations).where(eq(assistantConversations.id, id))
}

export async function appendMessage(conversationId: number, message: ChatMessage) {
    await useDb().insert(assistantMessages).values({
        conversationId,
        role: message.role,
        content: message.content,
        toolCalls: message.toolCalls?.length ? message.toolCalls : null,
        toolCallId: message.toolCallId ?? null,
    })
    await useDb().update(assistantConversations).set({ updatedAt: new Date() }).where(eq(assistantConversations.id, conversationId))
}

/** The transcript as the model sees it (last 40 messages). */
export async function loadTranscript(conversationId: number): Promise<ChatMessage[]> {
    const rows = await useDb().select().from(assistantMessages)
        .where(eq(assistantMessages.conversationId, conversationId))
        .orderBy(desc(assistantMessages.id)).limit(40)
    return rows.reverse().map(row => ({
        role: row.role,
        content: row.content,
        toolCalls: (row.toolCalls ?? undefined) as ToolCall[] | undefined,
        toolCallId: row.toolCallId ?? undefined,
    }))
}

/** What the page shows: user and assistant text and the proposal cards (system notes are for the model). */
export async function conversationView(userId: number, id: number) {
    const conversation = await getOwnConversation(userId, id)
    const rows = await useDb().select().from(assistantMessages)
        .where(and(eq(assistantMessages.conversationId, id), inArray(assistantMessages.role, ["user", "assistant"])))
        .orderBy(asc(assistantMessages.id))
    const messages: AssistantMessageView[] = rows
        .filter(row => row.content.trim())
        .map(row => ({ id: row.id, role: row.role as AssistantMessageView["role"], content: row.content, createdAt: row.createdAt.toISOString() }))
    const proposals = await useDb().select().from(assistantProposals)
        .where(eq(assistantProposals.conversationId, id)).orderBy(asc(assistantProposals.id))
    return { id: conversation.id, title: conversation.title, messages, proposals: proposals.map(toProposal) }
}

export function toProposal(row: typeof assistantProposals.$inferSelect): AssistantProposal {
    return { id: row.id, tool: row.tool, summary: row.summary, state: row.state, request: row.request }
}

export async function createProposal(input: { conversationId: number, userId: number, tool: string, args: Record<string, unknown>, summary: string, request: AssistantProposal["request"] }) {
    const [result] = await useDb().insert(assistantProposals).values({ ...input, state: "pending" }).$returningId()
    return getProposal(input.userId, result!.id)
}

export async function getProposal(userId: number, id: number) {
    const [row] = await useDb().select().from(assistantProposals)
        .where(and(eq(assistantProposals.id, id), eq(assistantProposals.userId, userId))).limit(1)
    if (!row) throw fail(404, "assistant.proposal_not_found")
    return row
}

/**
 * Atomic state change: only succeeds when the proposal is still in `from`, so two tabs
 * (or a double click) cannot both run it. 409 otherwise.
 */
export async function transitionProposal(userId: number, id: number, from: ProposalState, to: ProposalState, resultId?: string) {
    const [result] = await useDb().update(assistantProposals)
        .set({ state: to, ...(resultId !== undefined ? { resultId } : {}) })
        .where(and(eq(assistantProposals.id, id), eq(assistantProposals.userId, userId), eq(assistantProposals.state, from)))
    if (result.affectedRows !== 1) {
        await getProposal(userId, id)
        throw fail(409, "assistant.proposal_handled")
    }
    realtime.publishToUser(userId, "assistant.proposal_updated", { id })
}
