const ALWAYS_OPEN = [/^\/api\/auth\//, /^\/api\/_auth\//, /^\/api\/health$/, /^\/api\/settings\/public$/]

/** In maintenance, only admins reach the API. Pages are redirected by the route middleware. */
export default defineEventHandler(async (event) => {
    const path = event.path.split("?")[0]!
    if (!path.startsWith("/api/") || ALWAYS_OPEN.some(pattern => pattern.test(path))) return
    if (!(await getSetting("maintenance.enabled"))) return
    // Real roles, not mimicked ones: an admin viewing as "user" must not lock themselves out.
    const roles = event.context.auth?.user.roles ?? []
    if (can(roles, "settings", "manage")) return
    throw fail(503, "system.maintenance")
})
