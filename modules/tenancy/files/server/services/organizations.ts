import { and, asc, count, eq } from "drizzle-orm"
import type { MemberAdd, OrgCreate } from "#shared/schemas/organizations"
import type { OrgRole } from "#shared/utils/tenancy"
import { canAssignOrgRole } from "#shared/utils/tenancy"
import { memberships, organizations, users } from "../db/schema"
import type { ServiceContext } from "./users"
import type { Membership } from "../utils/tenancy"

export async function listMyOrganizations(userId: number) {
    return useDb()
        .select({ id: organizations.id, name: organizations.name, role: memberships.role })
        .from(memberships)
        .innerJoin(organizations, eq(organizations.id, memberships.orgId))
        .where(eq(memberships.userId, userId))
        .orderBy(asc(organizations.name))
}

export async function createOrganization(ctx: ServiceContext, input: OrgCreate) {
    const id = await useDb().transaction(async (tx) => {
        const [result] = await tx.insert(organizations).values({ name: input.name }).$returningId()
        await tx.insert(memberships).values({ orgId: result!.id, userId: ctx.actor.id, role: "owner" })
        return result!.id
    })
    await audit(ctx.event, { action: "organizations.create", resource: "organizations", resourceId: id })
    realtime.publishToUser(ctx.actor.id, "organizations.changed", { orgId: id })
    return { id, name: input.name, role: "owner" as OrgRole }
}

export async function renameOrganization(ctx: ServiceContext, membership: Membership, input: OrgCreate) {
    await useDb().update(organizations).set({ name: input.name }).where(eq(organizations.id, membership.org.id))
    await audit(ctx.event, { action: "organizations.update", resource: "organizations", resourceId: membership.org.id })
    await publishToOrg(membership.org.id, "organizations.changed")
}

export async function deleteOrganization(ctx: ServiceContext, membership: Membership) {
    const orgId = membership.org.id
    const members = await useDb().select({ userId: memberships.userId }).from(memberships).where(eq(memberships.orgId, orgId))
    await useDb().delete(organizations).where(eq(organizations.id, orgId))
    await audit(ctx.event, { action: "organizations.delete", resource: "organizations", resourceId: orgId })
    // The rows are gone, so tell the former members directly.
    for (const member of members) realtime.publishToUser(member.userId, "organizations.changed", { orgId })
}

export async function listMembers(orgId: number) {
    return useDb()
        .select({ userId: users.id, name: users.name, email: users.email, role: memberships.role, since: memberships.createdAt })
        .from(memberships)
        .innerJoin(users, eq(users.id, memberships.userId))
        .where(eq(memberships.orgId, orgId))
        .orderBy(asc(users.name))
}

async function countOwners(orgId: number) {
    const [row] = await useDb().select({ value: count() }).from(memberships)
        .where(and(eq(memberships.orgId, orgId), eq(memberships.role, "owner")))
    return row?.value ?? 0
}

async function findMemberRole(orgId: number, userId: number): Promise<OrgRole | null> {
    const [row] = await useDb().select({ role: memberships.role }).from(memberships)
        .where(and(eq(memberships.orgId, orgId), eq(memberships.userId, userId))).limit(1)
    return row?.role ?? null
}

/** Adds an existing account by email (inviting new people is the core invites flow). */
export async function addMember(ctx: ServiceContext, membership: Membership, input: MemberAdd) {
    if (!canAssignOrgRole(membership.role, null, input.role)) throw fail(403, "auth.forbidden")
    const [user] = await useDb().select({ id: users.id }).from(users).where(eq(users.email, input.email)).limit(1)
    if (!user) throw fail(404, "orgs.user_not_found")
    if (await findMemberRole(membership.org.id, user.id)) throw fail(409, "orgs.already_member")
    await useDb().insert(memberships).values({ orgId: membership.org.id, userId: user.id, role: input.role })
    await audit(ctx.event, { action: "organizations.member_add", resource: "organizations", resourceId: membership.org.id, meta: { userId: user.id, role: input.role } })
    await publishToOrg(membership.org.id, "organizations.members_changed")
    realtime.publishToUser(user.id, "organizations.changed", { orgId: membership.org.id })
}

export async function changeMemberRole(ctx: ServiceContext, membership: Membership, userId: number, role: OrgRole) {
    const orgId = membership.org.id
    const current = await findMemberRole(orgId, userId)
    if (!current) throw fail(404, "orgs.member_not_found")
    if (!canAssignOrgRole(membership.role, current, role)) throw fail(403, "auth.forbidden")
    if (current === "owner" && role !== "owner" && await countOwners(orgId) <= 1) throw fail(409, "orgs.last_owner")
    await useDb().update(memberships).set({ role }).where(and(eq(memberships.orgId, orgId), eq(memberships.userId, userId)))
    await audit(ctx.event, { action: "organizations.member_role", resource: "organizations", resourceId: orgId, meta: { userId, role } })
    await publishToOrg(orgId, "organizations.members_changed")
}

/** Removing someone else needs manage_members; anyone may remove themselves (leave). */
export async function removeMember(ctx: ServiceContext, membership: Membership, userId: number) {
    const orgId = membership.org.id
    const current = await findMemberRole(orgId, userId)
    if (!current) throw fail(404, "orgs.member_not_found")
    const self = userId === ctx.actor.id
    if (!self && !canAssignOrgRole(membership.role, current, "member")) throw fail(403, "auth.forbidden")
    if (current === "owner" && await countOwners(orgId) <= 1) throw fail(409, "orgs.last_owner")
    await useDb().delete(memberships).where(and(eq(memberships.orgId, orgId), eq(memberships.userId, userId)))
    await audit(ctx.event, { action: self ? "organizations.leave" : "organizations.member_remove", resource: "organizations", resourceId: orgId, meta: { userId } })
    await publishToOrg(orgId, "organizations.members_changed")
    realtime.publishToUser(userId, "organizations.changed", { orgId })
}
