import type { H3Event } from "h3"
import { createRateLimiter } from "./rateLimiter"
import type { RateLimiter } from "./rateLimiter"

/**
 * The authenticated user, as validated against the database by middleware/01.session.
 * A user who must change their password only reaches routes that opt in.
 */
export function requireUser(event: H3Event, options: { allowPasswordChange?: boolean } = {}): AuthUser {
    const auth = event.context.auth
    if (!auth) throw fail(401, "auth.unauthenticated")
    if (auth.user.mustChangePassword && !options.allowPasswordChange) {
        throw fail(403, "auth.password_change_required")
    }
    return auth.user
}

export function assertPermission(user: AuthUser, resource: Resource, action: Action) {
    if (!can(user.effectiveRoles, resource, action)) throw fail(403, "auth.forbidden")
}

let credentialLimiter: { signature: string, limiter: RateLimiter } | undefined

/** Throttles login, setup and invite acceptance per IP, from the security.login setting. */
export async function enforceCredentialLimit(event: H3Event, purpose: string) {
    const config = await getSetting("security.login")
    const signature = `${config.limit}/${config.windowMinutes}`
    if (credentialLimiter?.signature !== signature) {
        credentialLimiter = {
            signature,
            limiter: createRateLimiter({ limit: config.limit, windowMs: config.windowMinutes * 60_000 }),
        }
    }
    const result = credentialLimiter.limiter.hit(`${purpose}:${resolveClientIp(event)}`)
    if (!result.allowed) {
        setResponseHeader(event, "Retry-After", result.retryAfterSeconds)
        throw fail(429, "system.rate_limited")
    }
}

let dummyHash: Promise<string> | undefined

/** Verifying against a throwaway hash keeps "no such email" as slow as "wrong password". */
export function timingDummyHash() {
    dummyHash ??= hashPassword("timing-equaliser-not-a-real-password")
    return dummyHash
}
