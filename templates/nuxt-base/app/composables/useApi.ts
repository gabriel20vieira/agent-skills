type FetchOptions = NonNullable<Parameters<typeof $fetch>[1]>

/**
 * $fetch that forwards cookies during SSR and reacts to the auth envelope:
 * 401 -> sign-in page, auth.password_change_required -> password page.
 */
export function useApi() {
    const fetcher = useRequestFetch()
    const user = useState<AuthUser | null>("auth:user")

    return <T = unknown>(url: string, options: FetchOptions = {}): Promise<T> =>
        fetcher<T>(url, {
            ...options,
            async onResponseError({ response }) {
                if (!import.meta.client) return
                const code = (response._data as { data?: { code?: string } } | undefined)?.data?.code
                if (response.status === 401 && !url.startsWith("/api/auth/")) {
                    user.value = null
                    const here = useRoute().fullPath
                    await navigateTo(`/entrar?redirect=${encodeURIComponent(here)}`)
                }
                else if (code === "auth.password_change_required") {
                    await navigateTo("/conta/password")
                }
            },
        }) as Promise<T>
}
