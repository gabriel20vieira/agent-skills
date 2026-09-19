import { findUserById } from "../../services/users"
import { mimicSchema } from "../../../shared/schemas/auth"

/** Lets a real admin view the app as other roles, to check what they see. */
export default defineEventHandler(async (event) => {
    const user = requireUser(event)
    if (!user.roles.includes("admin")) throw fail(403, "auth.forbidden")
    const body = await readBodyWith(event, mimicSchema)
    await refreshSession(event, (await findUserById(user.id))!, { mimicRoles: body.roles })
    await audit(event, { action: "auth.mimic", resource: "users", resourceId: user.id, meta: { roles: body.roles } })
    return toAuthUser(user, body.roles)
})
