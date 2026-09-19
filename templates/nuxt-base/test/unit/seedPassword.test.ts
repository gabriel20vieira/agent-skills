import { Hash } from "@adonisjs/hash"
import { Scrypt } from "@adonisjs/hash/drivers/scrypt"
import { describe, expect, it } from "vitest"
import { hashPassword } from "../../scripts/lib/password.mjs"

describe("seed password hashing", () => {
    it("produces hashes the app (nuxt-auth-utils defaults) accepts", async () => {
        const hashed = await hashPassword("seed-password-123")
        expect(hashed.startsWith("$scrypt$")).toBe(true)
        const app = new Hash(new Scrypt({}))
        expect(await app.verify(hashed, "seed-password-123")).toBe(true)
        expect(await app.verify(hashed, "other")).toBe(false)
    })
})
