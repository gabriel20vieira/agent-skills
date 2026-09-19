import { deleteConversation } from "../../../services/assistant"

export default defineEventHandler(async (event) => {
    const user = requireUser(event)
    assertPermission(user, "assistant", "read")
    await deleteConversation(user.id, readIdParam(event, "assistant.not_found"))
    return { ok: true }
})
