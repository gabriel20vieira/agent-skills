import { randomUUID } from "node:crypto"
import type { H3Event } from "h3"
import { and, eq, isNull, ne } from "drizzle-orm"
import type { UserSession } from "#auth-utils"
import { sessions } from "../db/schema"
import type { UserRow } from "../db/schema"

export const REMEMBER_MAX_AGE = 60 * 60 * 24 * 30
export const DEFAULT_MAX_AGE = 60 * 60 * 24

export function sessionMaxAge(remember: boolean | undefined) {
    return remember ? REMEMBER_MAX_AGE : DEFAULT_MAX_AGE
}

export function toSessionUser(row: UserRow): SessionUser {
    return {
        id: row.id,
        name: row.name,
        email: row.email,
        roles: row.roles,
        passwordVersion: row.passwordVersion,
        mustChangePassword: row.mustChangePassword,
        locale: row.locale,
        theme: row.theme,
    }
}

export function toAuthUser(user: SessionUser, mimicRoles?: Role[]): AuthUser {
    return { ...user, effectiveRoles: mimicRoles ?? user.roles, mimicking: !!mimicRoles }
}

/** One sessions row per login; the sealed cookie only carries its id and a user snapshot. */
export async function createSession(event: H3Event, row: UserRow, remember: boolean) {
    const id = randomUUID()
    const maxAge = sessionMaxAge(remember)
    await useDb().insert(sessions).values({
        id,
        userId: row.id,
        ip: resolveClientIp(event).slice(0, 64),
        userAgent: (getHeader(event, "user-agent") ?? "").slice(0, 300),
        expiresAt: new Date(Date.now() + maxAge * 1000),
    })
    await writeSession(event, { user: toSessionUser(row), sid: id, remember, mimicRoles: undefined })
}

/**
 * replaceUserSession keeps keys that are not named, so every key is always written,
 * even as undefined, or a cleared value would survive.
 */
export async function writeSession(event: H3Event, data: Required<Pick<UserSession, "user" | "sid">> & Pick<UserSession, "remember" | "mimicRoles">) {
    await replaceUserSession(
        event,
        { user: data.user, sid: data.sid, remember: data.remember, mimicRoles: data.mimicRoles },
        { maxAge: sessionMaxAge(data.remember) },
    )
}

/** Re-seal the cookie with fresh user data, keeping sid, lifetime and mimic state. */
export async function refreshSession(event: H3Event, row: UserRow, patch: Pick<UserSession, "mimicRoles"> = {}) {
    const current = await getUserSession(event)
    if (!current.sid) return
    await writeSession(event, {
        user: toSessionUser(row),
        sid: current.sid,
        remember: current.remember,
        mimicRoles: "mimicRoles" in patch ? patch.mimicRoles : current.mimicRoles,
    })
}

export async function revokeSession(id: string) {
    await useDb().update(sessions).set({ revokedAt: new Date() }).where(eq(sessions.id, id))
}

export async function revokeUserSessions(userId: number, exceptSid?: string) {
    const conditions = [eq(sessions.userId, userId), isNull(sessions.revokedAt)]
    if (exceptSid) conditions.push(ne(sessions.id, exceptSid))
    await useDb().update(sessions).set({ revokedAt: new Date() }).where(and(...conditions))
}
