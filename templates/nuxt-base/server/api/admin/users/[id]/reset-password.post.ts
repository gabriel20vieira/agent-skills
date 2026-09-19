import { resetUserPassword } from "../../../../services/users"

/** Returns the new password once; the user must change it at next login. */
export default defineEventHandler(async (event) => {
    const actor = requireUser(event)
    assertPermission(actor, "users", "update")
    return resetUserPassword({ event, actor }, readIdParam(event, "users.not_found"))
})
