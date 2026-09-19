import { createOrganization } from "../../services/organizations"
import { orgCreateSchema } from "#shared/schemas/organizations"

export default defineEventHandler(async (event) => {
    const actor = requireUser(event)
    assertPermission(actor, "organizations", "create")
    const body = await readBodyWith(event, orgCreateSchema)
    const created = await createOrganization({ event, actor }, body)
    setActiveOrgCookie(event, created.id)
    setResponseStatus(event, 201)
    return created
})
