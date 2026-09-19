import { renameOrganization } from "../../services/organizations"
import { orgUpdateSchema } from "#shared/schemas/organizations"

export default defineEventHandler(async (event) => {
    const membership = await requireMembership(event, readIdParam(event, "orgs.not_found"))
    assertOrgPermission(membership, "manage_org")
    const body = await readBodyWith(event, orgUpdateSchema)
    await renameOrganization({ event, actor: membership.user }, membership, body)
    return { ok: true }
})
