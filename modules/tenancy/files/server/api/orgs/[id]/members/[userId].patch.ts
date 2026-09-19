import { changeMemberRole } from "../../../../services/organizations"
import { memberUpdateSchema } from "#shared/schemas/organizations"

export default defineEventHandler(async (event) => {
    const membership = await requireMembership(event, readIdParam(event, "orgs.not_found"))
    assertOrgPermission(membership, "manage_members")
    const userId = readIdParam(event, "orgs.member_not_found", "userId")
    const { role } = await readBodyWith(event, memberUpdateSchema)
    await changeMemberRole({ event, actor: membership.user }, membership, userId, role)
    return { ok: true }
})
