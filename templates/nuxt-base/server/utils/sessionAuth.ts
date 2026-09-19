import { eq } from "drizzle-orm"
import type { UserSession } from "#auth-utils"
import { sessions, users } from "../db/schema"

export interface SessionAuth {
    user: AuthUser
    sid: string
    /** Whether lastSeenAt is older than a minute (the caller may refresh it). */
    stale: boolean
}

/**
 * Turns an unsealed cookie into the authenticated user, or null when the session row is
 * missing, revoked or expired, the user is inactive, or the password changed since.
 * Shared by the HTTP middleware and the WebSocket upgrade.
 */
export async function resolveSessionAuth(session: UserSession): Promise<SessionAuth | null> {
    if (!session.sid || !session.user) return null
    const [row] = await useDb()
        .select({ session: sessions, user: users })
        .from(sessions)
        .innerJoin(users, eq(users.id, sessions.userId))
        .where(eq(sessions.id, session.sid))
        .limit(1)

    const now = Date.now()
    if (
        !row
        || row.session.revokedAt
        || row.session.expiresAt.getTime() <= now
        || !row.user.active
        || row.user.passwordVersion !== session.user.passwordVersion
    ) {
        return null
    }

    const fresh = toSessionUser(row.user)
    // Only a real admin may view the app as other roles.
    const mimicRoles = session.mimicRoles && fresh.roles.includes("admin") ? session.mimicRoles : undefined
    return {
        user: toAuthUser(fresh, mimicRoles),
        sid: session.sid,
        stale: now - row.session.lastSeenAt.getTime() > 60_000,
    }
}
