import type { OrgRole } from "#shared/utils/tenancy"

export interface MyOrganization {
    id: number
    name: string
    role: OrgRole
}

interface OrgState {
    organizations: MyOrganization[]
    activeId: number | null
}

/**
 * The user's organisations and the active one, shared app-wide. Switching refetches
 * every page's data, since org-scoped endpoints read the active organisation.
 */
export function useOrganizations() {
    const api = useApi()
    const state = useState<OrgState | null>("orgs", () => null)

    async function refresh() {
        state.value = await api<OrgState>("/api/orgs")
    }

    async function switchTo(orgId: number) {
        await api("/api/orgs/active", { method: "PUT", body: { orgId } })
        if (state.value) state.value = { ...state.value, activeId: orgId }
        await refreshNuxtData()
    }

    const organizations = computed(() => state.value?.organizations ?? [])
    const active = computed(() => organizations.value.find(org => org.id === state.value?.activeId) ?? null)

    return { state, organizations, active, refresh, switchTo }
}

/**
 * Keeps an org-scoped view fresh: refreshes on `<resource>.*` events for the active
 * organisation (they reach each member through their own user topic; see publishToOrg).
 */
export function useLiveOrgResource(resource: string, refresh: () => unknown) {
    const { active } = useOrganizations()
    useRealtimeEvent("*", (data, message) => {
        const orgId = (data as { orgId?: number } | undefined)?.orgId
        if (message.event.startsWith(`${resource}.`) && orgId === active.value?.id) void refresh()
    })
}
