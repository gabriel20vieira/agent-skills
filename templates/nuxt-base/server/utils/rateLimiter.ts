export interface RateLimitResult {
    allowed: boolean
    retryAfterSeconds: number
}

/**
 * Fixed-window counter kept in memory: right for a single instance. Several instances
 * would need a shared store (Redis) behind the same interface.
 */
export function createRateLimiter(options: { limit: number, windowMs: number }) {
    const buckets = new Map<string, { count: number, resetAt: number }>()

    function hit(key: string, now = Date.now()): RateLimitResult {
        if (buckets.size > 10_000) {
            for (const [k, bucket] of buckets) if (bucket.resetAt <= now) buckets.delete(k)
        }
        let bucket = buckets.get(key)
        if (!bucket || bucket.resetAt <= now) {
            bucket = { count: 0, resetAt: now + options.windowMs }
            buckets.set(key, bucket)
        }
        bucket.count++
        if (bucket.count > options.limit) {
            return { allowed: false, retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000) }
        }
        return { allowed: true, retryAfterSeconds: 0 }
    }

    function reset(key: string) {
        buckets.delete(key)
    }

    return { hit, reset }
}

export type RateLimiter = ReturnType<typeof createRateLimiter>
