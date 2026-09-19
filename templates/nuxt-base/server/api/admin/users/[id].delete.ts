import { deleteUser } from "../../../services/users"

export default defineEventHandler(async (event) => {
    const actor = requireUser(event)
    assertPermission(actor, "users", "delete")
    await deleteUser({ event, actor }, readIdParam(event, "users.not_found"))
    return { ok: true }
})
