import { listMyOrganizations } from "../../services/organizations"

/** The user's organisations and the active one (the cookie, if still a member; else the first). */
export default defineEventHandler(async (event) => {
    const user = requireUser(event)
    const organizations = await listMyOrganizations(user.id)
    const wanted = activeOrgId(event)
    const activeId = organizations.some(org => org.id === wanted) ? wanted : (organizations[0]?.id ?? null)
    return { organizations, activeId }
})
