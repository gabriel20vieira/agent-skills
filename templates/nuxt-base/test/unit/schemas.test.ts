import { describe, expect, it } from "vitest"
import { loginSchema } from "../../shared/schemas/auth"
import { passwordSchema } from "../../shared/schemas/password"
import { userCreateSchema } from "../../shared/schemas/users"
import { SETTINGS } from "../../shared/utils/settings"

describe("schemas", () => {
    it("requires 12+ character passwords", () => {
        expect(passwordSchema.safeParse("a".repeat(11)).success).toBe(false)
        expect(passwordSchema.safeParse("a".repeat(12)).success).toBe(true)
    })
    it("normalises email on login", () => {
        const parsed = loginSchema.parse({ email: "  Ana@Example.COM ", password: "x" })
        expect(parsed.email).toBe("ana@example.com")
        expect(parsed.remember).toBe(false)
    })
    it("rejects unknown roles", () => {
        const result = userCreateSchema.safeParse({ email: "a@b.pt", name: "A", roles: ["root"] })
        expect(result.success).toBe(false)
    })
    it("requires at least one role", () => {
        expect(userCreateSchema.safeParse({ email: "a@b.pt", name: "A", roles: [] }).success).toBe(false)
    })
    it("setting defaults satisfy their own schemas", () => {
        for (const [key, definition] of Object.entries(SETTINGS)) {
            expect(definition.schema.safeParse(definition.default).success, key).toBe(true)
        }
    })
})
