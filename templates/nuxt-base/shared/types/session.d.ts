import type { Role } from "../utils/permissions"
import type { AuthUser, SessionUser } from "./auth"

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

declare module "h3" {
    interface H3EventContext {
        /** Set by server/middleware/01.session once the session row and user are valid. */
        auth?: { user: AuthUser, sid: string }
    }
}

export {}
