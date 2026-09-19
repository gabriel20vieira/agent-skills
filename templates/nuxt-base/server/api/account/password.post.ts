import { eq } from "drizzle-orm"
import { users } from "../../db/schema"
import { findUserById } from "../../services/users"
import { changePasswordSchema } from "../../../shared/schemas/account"

/** Changing the password signs out every other device (passwordVersion + revocation). */
export default defineEventHandler(async (event) => {
    const user = requireUser(event, { allowPasswordChange: true })
    const body = await readBodyWith(event, changePasswordSchema)
    const row = (await findUserById(user.id))!
    if (!(await verifyPassword(row.passwordHash, body.current))) throw fail(400, "account.wrong_password")

    await useDb().update(users).set({
        passwordHash: await hashPassword(body.next),
        passwordVersion: row.passwordVersion + 1,
        mustChangePassword: false,
    }).where(eq(users.id, user.id))
    const sid = event.context.auth!.sid
    await revokeUserSessions(user.id, sid)
    // Re-seal with the new passwordVersion or this very session would be rejected next.
    await refreshSession(event, (await findUserById(user.id))!)
    await audit(event, { action: "account.password_change", resource: "users", resourceId: user.id })
    return { ok: true }
})
