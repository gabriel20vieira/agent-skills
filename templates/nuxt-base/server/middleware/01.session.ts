import { eq } from "drizzle-orm"
import { sessions, users } from "../db/schema"

const LAST_SEEN_THROTTLE_MS = 60_000

/**
 * Validates the sealed cookie against the database on every request, so revoking a
 * session, deactivating a user or changing a password takes effect immediately.
 */
export default defineEventHandler(async (event) => {
    if (event.path.startsWith("/_nuxt/") || event.path.startsWith("/__nuxt")) return

    const session = await getUserSession(event)
    if (!session.sid || !session.user) return

    let row
    try {
        [row] = await useDb()
            .select({ session: sessions, user: users })
            .from(sessions)
            .innerJoin(users, eq(users.id, sessions.userId))
            .where(eq(sessions.id, session.sid))
            .limit(1)
    }
    catch (error) {
        // Database down: treat the request as anonymous rather than failing every page.
        console.error("[session] validation skipped:", (error as Error).message)
        return
    }

    const now = new Date()
    const invalid = !row
        || row.session.revokedAt
        || row.session.expiresAt <= now
        || !row.user.active
        || row.user.passwordVersion !== session.user.passwordVersion
    if (!row || invalid) {
        await clearUserSession(event)
        return
    }

    const fresh = toSessionUser(row.user)
    // Only a real admin may view the app as other roles.
    const mimicRoles = session.mimicRoles && fresh.roles.includes("admin") ? session.mimicRoles : undefined
    event.context.auth = { user: toAuthUser(fresh, mimicRoles), sid: session.sid }

    if (now.getTime() - row.session.lastSeenAt.getTime() > LAST_SEEN_THROTTLE_MS) {
        await useDb().update(sessions).set({ lastSeenAt: now }).where(eq(sessions.id, session.sid))
    }
})
