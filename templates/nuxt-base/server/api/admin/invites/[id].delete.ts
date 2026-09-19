import { deleteInvite } from "../../../services/invites"

export default defineEventHandler(async (event) => {
    const actor = requireUser(event)
    assertPermission(actor, "users", "create")
    await deleteInvite({ event, actor }, readIdParam(event, "invites.not_found"))
    return { ok: true }
})
