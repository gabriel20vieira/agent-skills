import { describe, expect, it } from "vitest"
import { constantTimeEqual, generatePassword, hashToken, newToken } from "../../server/utils/tokens"

describe("tokens", () => {
    it("generates grouped passwords without ambiguous characters", () => {
        const seen = new Set<string>()
        for (let i = 0; i < 1000; i++) {
            const password = generatePassword()
            expect(password).toMatch(/^[2-9a-hjkmnp-zA-HJ-NP-Z]{4}(-[2-9a-hjkmnp-zA-HJ-NP-Z]{4}){3}$/)
            seen.add(password)
        }
        expect(seen.size).toBe(1000)
    })
    it("generated passwords satisfy the 12 character minimum", () => {
        expect(generatePassword().length).toBeGreaterThanOrEqual(12)
    })
    it("compares in constant time and handles length mismatch", () => {
        expect(constantTimeEqual("abc", "abc")).toBe(true)
        expect(constantTimeEqual("abc", "abd")).toBe(false)
        expect(constantTimeEqual("abc", "abcd")).toBe(false)
    })
    it("hashes tokens deterministically to hex sha256", () => {
        expect(hashToken("x")).toBe(hashToken("x"))
        expect(hashToken("x")).toMatch(/^[0-9a-f]{64}$/)
    })
    it("creates url-safe random tokens", () => {
        const token = newToken()
        expect(token).toMatch(/^[\w-]{43}$/)
        expect(newToken()).not.toBe(token)
    })
})
