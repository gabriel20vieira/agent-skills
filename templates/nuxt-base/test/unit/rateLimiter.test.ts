import { describe, expect, it } from "vitest"
import { createRateLimiter } from "../../server/utils/rateLimiter"

describe("createRateLimiter", () => {
    it("allows up to the limit then blocks", () => {
        const limiter = createRateLimiter({ limit: 2, windowMs: 1000 })
        expect(limiter.hit("ip", 0).allowed).toBe(true)
        expect(limiter.hit("ip", 1).allowed).toBe(true)
        expect(limiter.hit("ip", 2)).toEqual({ allowed: false, retryAfterSeconds: 1 })
    })
    it("keys are independent", () => {
        const limiter = createRateLimiter({ limit: 1, windowMs: 1000 })
        expect(limiter.hit("a", 0).allowed).toBe(true)
        expect(limiter.hit("b", 0).allowed).toBe(true)
    })
    it("resets after the window", () => {
        const limiter = createRateLimiter({ limit: 1, windowMs: 1000 })
        limiter.hit("ip", 0)
        expect(limiter.hit("ip", 500).allowed).toBe(false)
        expect(limiter.hit("ip", 1001).allowed).toBe(true)
    })
    it("reports retry-after in whole seconds", () => {
        const limiter = createRateLimiter({ limit: 1, windowMs: 60_000 })
        limiter.hit("ip", 0)
        expect(limiter.hit("ip", 10_500).retryAfterSeconds).toBe(50)
    })
    it("reset clears a key", () => {
        const limiter = createRateLimiter({ limit: 1, windowMs: 1000 })
        limiter.hit("ip", 0)
        limiter.reset("ip")
        expect(limiter.hit("ip", 1).allowed).toBe(true)
    })
})
