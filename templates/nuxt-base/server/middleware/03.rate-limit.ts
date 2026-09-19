import { createRateLimiter } from "../utils/rateLimiter"
import type { RateLimiter } from "../utils/rateLimiter"

let current: { signature: string, limiter: RateLimiter } | undefined

/** Global per-IP ceiling on /api, from the security.api setting. */
export default defineEventHandler(async (event) => {
    const path = event.path.split("?")[0]!
    if (!path.startsWith("/api/") || path === "/api/health") return

    const config = await getSetting("security.api")
    const signature = `${config.limit}/${config.windowSeconds}`
    if (current?.signature !== signature) {
        current = { signature, limiter: createRateLimiter({ limit: config.limit, windowMs: config.windowSeconds * 1000 }) }
    }
    const result = current.limiter.hit(resolveClientIp(event))
    if (!result.allowed) {
        setResponseHeader(event, "Retry-After", result.retryAfterSeconds)
        throw fail(429, "system.rate_limited")
    }
})
