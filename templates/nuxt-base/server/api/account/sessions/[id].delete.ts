import { and, eq } from "drizzle-orm"
import { sessions } from "../../../db/schema"

export default defineEventHandler(async (event) => {
    const user = requireUser(event)
    const id = getRouterParam(event, "id") ?? ""
    const [row] = await useDb().select({ id: sessions.id }).from(sessions)
        .where(and(eq(sessions.id, id), eq(sessions.userId, user.id))).limit(1)
    // Someone else's session reads as missing, not forbidden.
    if (!row) throw fail(404, "sessions.not_found")
    await revokeSession(id)
    if (id === event.context.auth!.sid) await clearUserSession(event)
    return { ok: true }
})
