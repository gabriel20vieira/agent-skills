export const ROLES = ["admin", "editor", "user"] as const
export type Role = (typeof ROLES)[number]

/** Modules append their resources here. */
export const RESOURCES = ["users", "settings", "audit", "notes"] as const
export type Resource = (typeof RESOURCES)[number]

export const ACTIONS = ["read", "create", "update", "delete", "manage"] as const
export type Action = (typeof ACTIONS)[number]

const CRUD = ["read", "create", "update", "delete"] as const
const ALL = ["manage"] as const

/**
 * The single permission matrix, read by the server (assertPermission) and the client
 * (useCan, <Can>, navigation). "manage" grants every action on that resource.
 */
export const PERMISSIONS: Record<Role, Partial<Record<Resource, readonly Action[]>>> = {
    admin: { users: ALL, settings: ALL, audit: ALL, notes: ALL },
    editor: { notes: CRUD },
    user: { notes: ["read"] },
}

export function can(roles: readonly Role[], resource: Resource, action: Action): boolean {
    return roles.some((role) => {
        const granted = PERMISSIONS[role]?.[resource]
        return !!granted && (granted.includes("manage") || granted.includes(action))
    })
}
