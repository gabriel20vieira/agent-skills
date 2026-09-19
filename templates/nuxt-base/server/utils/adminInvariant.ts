import type { Role } from "#shared/utils/permissions"

export interface AdminInvariantInput {
    actorId: number
    targetId: number
    /** The target is currently an active admin. */
    targetIsActiveAdmin: boolean
    next: { active: boolean, roles: readonly Role[] } | "delete"
    activeAdminCount: number
}

/**
 * The install must always keep one active admin, and an admin must not lock themselves
 * out. Returns the error code to raise, or null when the change is allowed.
 */
export function checkAdminInvariant(input: AdminInvariantInput): string | null {
    if (!input.targetIsActiveAdmin) return null
    const staysAdmin = input.next !== "delete" && input.next.active && input.next.roles.includes("admin")
    if (staysAdmin) return null
    if (input.actorId === input.targetId) return "users.self_lockout"
    if (input.activeAdminCount <= 1) return "users.last_admin"
    return null
}
