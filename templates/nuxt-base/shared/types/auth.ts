import type { Role } from "../utils/permissions"

/** What the sealed cookie carries; refreshed from the database on every request. */
export interface SessionUser {
    id: number
    name: string
    email: string
    roles: Role[]
    passwordVersion: number
    mustChangePassword: boolean
    locale: string | null
    theme: string | null
}

export interface AuthUser extends SessionUser {
    /** roles, or the ones an admin is temporarily viewing the app as. */
    effectiveRoles: Role[]
    mimicking: boolean
}
