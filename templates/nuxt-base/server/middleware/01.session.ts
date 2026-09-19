import { eq } from "drizzle-orm"
import { sessions } from "../db/schema"

/**
 * Validates the sealed cookie against the database on every request, so revoking a
 * session, deactivating a user or changing a password takes effect immediately.
 */
export default defineEventHandler(async (event) => {
    if (event.path.startsWith("/_nuxt/") || event.path.startsWith("/__nuxt") || event.path.startsWith("/_ws")) return

    const session = await getUserSession(event)
    if (!session.sid) return

    let auth
    try {
        auth = await resolveSessionAuth(session)
    }
    catch (error) {
        // Database down: treat the request as anonymous rather than failing every page.
        console.error("[session] validation skipped:", (error as Error).message)
        return
    }
    if (!auth) {
        await clearUserSession(event)
        return
    }

    event.context.auth = { user: auth.user, sid: auth.sid }
    if (auth.stale) {
        await useDb().update(sessions).set({ lastSeenAt: new Date() }).where(eq(sessions.id, auth.sid))
    }
})
