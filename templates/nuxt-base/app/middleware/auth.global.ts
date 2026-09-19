export default defineNuxtRouteMiddleware(async (to) => {
    const session = useSession()
    const publicSettings = usePublicSettings()
    await Promise.all([session.ensure(), publicSettings.ensure()])

    const needsSetup = useState("auth:needsSetup", () => false)
    if (!session.user.value) {
        const status = await useRequestFetch()<{ needsSetup: boolean }>("/api/auth/status").catch(() => null)
        needsSetup.value = !!status?.needsSetup
    }

    const result = resolveRoute(
        {
            needsSetup: needsSetup.value,
            maintenance: !!publicSettings.settings.value?.["maintenance.enabled"],
            user: session.user.value,
        },
        { path: to.path, fullPath: to.fullPath, meta: to.meta },
    )
    if (!result) return
    if ("redirect" in result) return navigateTo(result.redirect)
    return abortNavigation(createError({ statusCode: 403, statusMessage: "Forbidden" }))
})
