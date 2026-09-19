import { activeOrgSchema } from "#shared/schemas/organizations"

/** Switches the active organisation (only to one the user belongs to). */
export default defineEventHandler(async (event) => {
    const { orgId } = await readBodyWith(event, activeOrgSchema)
    const membership = await requireMembership(event, orgId)
    setActiveOrgCookie(event, membership.org.id)
    return { activeId: membership.org.id, role: membership.role }
})
