import { findUserById } from "../../services/users"

export default defineEventHandler(async (event) => {
    const user = requireUser(event)
    await refreshSession(event, (await findUserById(user.id))!, { mimicRoles: undefined })
    return toAuthUser(user)
})
