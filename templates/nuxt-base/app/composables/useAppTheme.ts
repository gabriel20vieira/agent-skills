/**
 * The colour theme: the user's choice (account or cookie) when the admin allows it,
 * else the admin's default. Applied as data-theme on <html> during SSR (plugins/theme.ts),
 * so the first paint already has the right colours.
 */
export function useAppTheme() {
    const cookie = useCookie<string | null>("app-theme", { maxAge: 60 * 60 * 24 * 365, sameSite: "lax" })
    const { settings } = usePublicSettings()
    const { user } = useSession()
    const api = useApi()

    const userThemes = computed(() => settings.value?.["appearance.userThemes"] !== false)
    const theme = computed<ThemeName>(() => {
        const personal = userThemes.value ? (user.value?.theme ?? cookie.value) : null
        const wanted = personal || settings.value?.["appearance.defaultTheme"] || "default"
        return isThemeName(wanted) ? wanted : "default"
    })

    async function setTheme(name: ThemeName) {
        cookie.value = name
        if (user.value) {
            user.value = await api<AuthUser>("/api/account", { method: "PATCH", body: { theme: name } })
        }
    }

    return { theme, themes: THEMES, userThemes, setTheme }
}
