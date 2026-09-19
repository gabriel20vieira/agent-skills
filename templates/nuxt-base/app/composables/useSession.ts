/**
 * The signed-in user, loaded from /api/auth/me (fresh from the database, unlike the
 * cookie snapshot). Shared state, fetched once per app load and on refresh().
 */
export function useSession() {
    const user = useState<AuthUser | null>("auth:user", () => null)
    const loaded = useState("auth:loaded", () => false)
    const fetcher = useRequestFetch()

    async function refresh() {
        try {
            user.value = await fetcher<AuthUser>("/api/auth/me")
        }
        catch {
            user.value = null
        }
        loaded.value = true
    }

    async function ensure() {
        if (!loaded.value) await refresh()
    }

    async function logout() {
        await $fetch("/api/auth/logout", { method: "POST" }).catch(() => undefined)
        user.value = null
        await navigateTo("/entrar")
    }

    return {
        user,
        loggedIn: computed(() => !!user.value),
        effectiveRoles: computed(() => user.value?.effectiveRoles ?? []),
        refresh,
        ensure,
        logout,
    }
}
