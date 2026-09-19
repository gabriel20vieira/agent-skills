import type { Role } from "./shared/utils/permissions"
import type { SessionUser } from "./shared/types/auth"

declare module "#auth-utils" {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface User extends SessionUser {}

    interface UserSession {
        /** Row id in the sessions table; the cookie is only valid while that row is. */
        sid?: string
        remember?: boolean
        /** Roles an admin is temporarily viewing the app as. */
        mimicRoles?: Role[]
    }
}

export {}
