import type { H3Event } from "h3"

/**
 * X-Forwarded-For is only honoured when NUXT_TRUST_PROXY is set: with nothing in front,
 * the header is attacker-controlled and would let anyone dodge the rate limits.
 */
export function resolveClientIp(event: H3Event): string {
    const trustProxy = !!useRuntimeConfig(event).trustProxy
    return getRequestIP(event, { xForwardedFor: trustProxy }) ?? "unknown"
}
