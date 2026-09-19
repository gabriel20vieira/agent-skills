import { describe, expect, it } from "vitest"
import { isWeakSecret } from "../../server/utils/secretStrength"

describe("isWeakSecret", () => {
    it("rejects missing and short secrets", () => {
        expect(isWeakSecret(undefined)).toBe(true)
        expect(isWeakSecret("")).toBe(true)
        expect(isWeakSecret("a".repeat(31))).toBe(true)
    })
    it("rejects known placeholders even when long", () => {
        expect(isWeakSecret("change-me-change-me-change-me-change-me")).toBe(true)
        expect(isWeakSecret("this-is-an-example-secret-of-enough-length")).toBe(true)
    })
    it("accepts a long random secret", () => {
        expect(isWeakSecret("q8Zc1vH0yT3kP9mW2sL7xN4bR6fJ5dA0gE1hU8iO3pK=")).toBe(false)
    })
})
