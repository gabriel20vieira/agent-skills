import type { AuthUser } from "../../shared/types/auth"
import type { Action, Resource } from "../../shared/utils/permissions"
import { can } from "../../shared/utils/permissions"

export interface GuardState {
    needsSetup: boolean
    maintenance: boolean
    user: AuthUser | null
}

export interface GuardRoute {
    path: string
    fullPath: string
    meta: {
        /** false = public page; "guest" = only when signed out (login, invite). */
        auth?: false | "guest"
        permission?: [Resource, Action]
    }
}

export type GuardResult = { redirect: string } | { error: 403 } | null

/**
 * Where a navigation should go. Pure, so every rule is unit-tested; the route middleware
 * only gathers the state and applies the answer.
 */
export function resolveRoute(state: GuardState, to: GuardRoute): GuardResult {
    const { user } = state
    // Real roles: an admin viewing as "user" must still get past maintenance.
    const isAdmin = !!user && can(user.roles, "settings", "manage")

    if (state.maintenance && !isAdmin && to.path !== "/manutencao" && to.path !== "/entrar") {
        return { redirect: "/manutencao" }
    }
    if (!state.maintenance && to.path === "/manutencao") return { redirect: "/" }

    if (state.needsSetup) return to.path === "/setup" ? null : { redirect: "/setup" }
    if (to.path === "/setup") return { redirect: user ? "/app" : "/entrar" }

    if (to.meta.auth === "guest") return user ? { redirect: "/app" } : null
    if (to.meta.auth === false) return null

    if (!user) return { redirect: `/entrar?redirect=${encodeURIComponent(to.fullPath)}` }
    if (user.mustChangePassword && to.path !== "/conta/password") return { redirect: "/conta/password" }

    const permission = to.meta.permission
    if (permission && !can(user.effectiveRoles, permission[0], permission[1])) return { error: 403 }
    return null
}
