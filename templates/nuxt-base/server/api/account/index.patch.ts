import { eq } from "drizzle-orm"
import { users } from "../../db/schema"
import { findUserById } from "../../services/users"
import { profileSchema } from "../../../shared/schemas/account"

export default defineEventHandler(async (event) => {
    const user = requireUser(event)
    const body = await readBodyWith(event, profileSchema)
    await useDb().update(users).set({
        name: body.name ?? user.name,
        locale: body.locale === undefined ? user.locale : body.locale,
        theme: body.theme === undefined ? user.theme : body.theme,
    }).where(eq(users.id, user.id))
    const row = (await findUserById(user.id))!
    await refreshSession(event, row)
    return toAuthUser(toSessionUser(row), user.mimicking ? user.effectiveRoles : undefined)
})
