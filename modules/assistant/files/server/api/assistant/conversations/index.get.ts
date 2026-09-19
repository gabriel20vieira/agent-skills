import { listConversations } from "../../../services/assistant"

export default defineEventHandler(async (event) => {
    const user = requireUser(event)
    assertPermission(user, "assistant", "read")
    return listConversations(user.id)
})
