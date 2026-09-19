import { users } from "../../db/schema"
import { countUsers, findUserById } from "../../services/users"
import { setupSchema } from "../../../shared/schemas/auth"

/** Creates the first admin. Only while there are no users, and only with NUXT_SETUP_CODE. */
export default defineEventHandler(async (event) => {
    const expectedCode = useRuntimeConfig(event).setupCode
    // Fail closed: an empty code must not mean "anyone may register".
    if (!expectedCode) throw fail(503, "auth.setup_disabled")
    if ((await countUsers()) > 0) throw fail(409, "auth.setup_done")

    await enforceCredentialLimit(event, "setup")
    const body = await readBodyWith(event, setupSchema)
    if (!constantTimeEqual(body.code, expectedCode)) throw fail(403, "auth.setup_code_invalid")

    const passwordHash = await hashPassword(body.password)
    const id = await useDb().transaction(async (tx) => {
        // FOR UPDATE takes a next-key lock, so two concurrent setups cannot both see zero.
        const existing = await tx.select({ id: users.id }).from(users).limit(1).for("update")
        if (existing.length) return null
        const [created] = await tx.insert(users).values({
            email: body.email,
            name: body.name,
            roles: ["admin"],
            passwordHash,
        }).$returningId()
        return created!.id
    })
    if (!id) throw fail(409, "auth.setup_done")

    const user = (await findUserById(id))!
    await createSession(event, user, false)
    await audit(event, { action: "auth.setup", resource: "users", resourceId: id, userId: id })
    return { ok: true }
})
