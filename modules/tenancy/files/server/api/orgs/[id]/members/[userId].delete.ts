import { removeMember } from "../../../../services/organizations"

/** Remove a member, or leave when userId is yourself. */
export default defineEventHandler(async (event) => {
    const membership = await requireMembership(event, readIdParam(event, "orgs.not_found"))
    const userId = readIdParam(event, "orgs.member_not_found", "userId")
    await removeMember({ event, actor: membership.user }, membership, userId)
    return { ok: true }
})
