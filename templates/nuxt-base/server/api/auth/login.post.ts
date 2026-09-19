import { eq } from "drizzle-orm"
import { users } from "../../db/schema"
import { findUserByEmail } from "../../services/users"
import { loginSchema } from "#shared/schemas/auth"

export default defineEventHandler(async (event) => {
    await enforceCredentialLimit(event, "login")
    const body = await readBodyWith(event, loginSchema)

    const user = await findUserByEmail(body.email)
    // Always verify something, so an unknown email costs the same time as a wrong password.
    const valid = await verifyPassword(user?.passwordHash ?? await timingDummyHash(), body.password)
    if (!user || !valid) throw fail(401, "auth.invalid_credentials")
    if (!user.active) throw fail(403, "auth.inactive")

    await useDb().update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id))
    await createSession(event, user, body.remember)
    return { ok: true }
})
