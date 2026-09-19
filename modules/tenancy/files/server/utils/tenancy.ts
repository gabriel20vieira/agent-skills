import type { H3Event } from "h3"
import { and, eq } from "drizzle-orm"
import type { OrgAction, OrgRole } from "#shared/utils/tenancy"
import { ORG_COOKIE, orgCan } from "#shared/utils/tenancy"
import { memberships, organizations } from "../db/schema"

export interface Membership {
    org: { id: number, name: string }
    role: OrgRole
}

export async function findMembership(userId: number, orgId: number): Promise<Membership | null> {
    const [row] = await useDb()
        .select({ id: organizations.id, name: organizations.name, role: memberships.role })
        .from(memberships)
        .innerJoin(organizations, eq(organizations.id, memberships.orgId))
        .where(and(eq(memberships.userId, userId), eq(memberships.orgId, orgId)))
        .limit(1)
    return row ? { org: { id: row.id, name: row.name }, role: row.role } : null
}

/** The organisation picked in the switcher (a cookie; verified on every use). */
export function activeOrgId(event: H3Event): number | null {
    const value = Number(getCookie(event, ORG_COOKIE))
    return Number.isInteger(value) && value > 0 ? value : null
}

export function setActiveOrgCookie(event: H3Event, orgId: number) {
    setCookie(event, ORG_COOKIE, String(orgId), {
        httpOnly: true,
        sameSite: "lax",
        secure: !import.meta.dev,
        path: "/",
        maxAge: 60 * 60 * 24 * 365,
    })
}

/**
 * The signed-in user's membership in `orgId` (default: the active organisation), or 404.
 * Not-a-member answers 404, not 403, so ids of other organisations reveal nothing.
 * Every org-scoped handler starts with this and filters its queries by `org.id`.
 */
export async function requireMembership(event: H3Event, orgId?: number): Promise<Membership & { user: AuthUser }> {
    const user = requireUser(event)
    const id = orgId ?? activeOrgId(event)
    if (!id) throw fail(409, "orgs.none_selected")
    const membership = await findMembership(user.id, id)
    if (!membership) throw fail(404, "orgs.not_found")
    return { ...membership, user }
}

export function assertOrgPermission(membership: Membership, action: OrgAction) {
    if (!orgCan(membership.role, action)) throw fail(403, "auth.forbidden")
}

/**
 * Realtime for an organisation: fans out to each member's own `user:<id>` topic, so no
 * extra topic authorisation is needed and removed members stop receiving at once.
 * Call after the write committed; ids only.
 */
export async function publishToOrg(orgId: number, name: string, data: Record<string, unknown> = {}) {
    const rows = await useDb().select({ userId: memberships.userId }).from(memberships).where(eq(memberships.orgId, orgId))
    for (const row of rows) realtime.publishToUser(row.userId, name, { ...data, orgId })
}
