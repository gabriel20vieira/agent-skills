import { listPendingInvites } from "../../../services/invites"

export default defineEventHandler(async (event) => {
    assertPermission(requireUser(event), "users", "create")
    return listPendingInvites()
})
