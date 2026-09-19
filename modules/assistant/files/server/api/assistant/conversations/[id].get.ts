import { conversationView } from "../../../services/assistant"

export default defineEventHandler(async (event) => {
    const user = requireUser(event)
    assertPermission(user, "assistant", "read")
    return conversationView(user.id, readIdParam(event, "assistant.not_found"))
})
