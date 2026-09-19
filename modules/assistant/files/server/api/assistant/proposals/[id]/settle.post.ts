import { toolContext } from "../../../../assistant/defineTool"
import { ASSISTANT_TOOLS } from "../../../../assistant/registry"
import { appendMessage, getProposal, transitionProposal } from "../../../../services/assistant"
import { proposalSettleSchema } from "#shared/schemas/assistant"

/**
 * Step 3 (after the browser ran the REST call): the server re-reads the database through
 * the tool's verify() and records done or failed, then tells the model in a system note.
 */
export default defineEventHandler(async (event) => {
    const user = requireUser(event)
    assertPermission(user, "assistant", "read")
    const id = readIdParam(event, "assistant.proposal_not_found")
    const body = await readBodyWith(event, proposalSettleSchema)
    const row = await getProposal(user.id, id)
    if (row.state !== "claimed") throw fail(409, "assistant.proposal_handled")

    const tool = ASSISTANT_TOOLS.find(item => item.name === row.tool)
    const verified = body.ok && tool?.kind === "propose"
        && await tool.verify(toolContext(event, user), row.args, body.resultId)
    const state = verified ? "done" : "failed"
    await transitionProposal(user.id, id, "claimed", state, body.resultId === undefined ? undefined : String(body.resultId))
    await appendMessage(row.conversationId, {
        role: "system",
        content: verified
            ? `Proposal ${id} (${row.summary}) was accepted and saved${body.resultId === undefined ? "" : ` (id ${body.resultId})`}.`
            : `Proposal ${id} (${row.summary}) failed${body.error ? `: ${body.error}` : ""}.`,
    })
    return { state }
})
