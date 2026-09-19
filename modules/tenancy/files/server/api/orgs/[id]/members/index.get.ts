import { listMembers } from "../../../../services/organizations"

export default defineEventHandler(async (event) => {
    const membership = await requireMembership(event, readIdParam(event, "orgs.not_found"))
    assertOrgPermission(membership, "read")
    return listMembers(membership.org.id)
})
