import { appendMessage, getProposal, transitionProposal } from "../../../../services/assistant"

export default defineEventHandler(async (event) => {
    const user = requireUser(event)
    assertPermission(user, "assistant", "read")
    const id = readIdParam(event, "assistant.proposal_not_found")
    const row = await getProposal(user.id, id)
    await transitionProposal(user.id, id, "pending", "rejected")
    await appendMessage(row.conversationId, { role: "system", content: `Proposal ${id} (${row.summary}) was rejected by the user.` })
    return { state: "rejected" }
})
