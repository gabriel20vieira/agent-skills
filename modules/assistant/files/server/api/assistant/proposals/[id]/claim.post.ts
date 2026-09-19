import { getProposal, toProposal, transitionProposal } from "../../../../services/assistant"

/** Step 1 of accepting a card: pending -> claimed, atomically (409 if already handled). */
export default defineEventHandler(async (event) => {
    const user = requireUser(event)
    assertPermission(user, "assistant", "read")
    const id = readIdParam(event, "assistant.proposal_not_found")
    await transitionProposal(user.id, id, "pending", "claimed")
    return toProposal(await getProposal(user.id, id))
})
