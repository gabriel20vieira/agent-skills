import { deleteOrganization } from "../../services/organizations"

export default defineEventHandler(async (event) => {
    const membership = await requireMembership(event, readIdParam(event, "orgs.not_found"))
    assertOrgPermission(membership, "delete_org")
    await deleteOrganization({ event, actor: membership.user }, membership)
    return { ok: true }
})
