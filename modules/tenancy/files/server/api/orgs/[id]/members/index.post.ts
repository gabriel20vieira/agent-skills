import { addMember } from "../../../../services/organizations"
import { memberAddSchema } from "#shared/schemas/organizations"

export default defineEventHandler(async (event) => {
    const membership = await requireMembership(event, readIdParam(event, "orgs.not_found"))
    assertOrgPermission(membership, "manage_members")
    const body = await readBodyWith(event, memberAddSchema)
    await addMember({ event, actor: membership.user }, membership, body)
    setResponseStatus(event, 201)
    return { ok: true }
})
