import { describe, expect, it } from "vitest"
import { fail } from "../../server/utils/fail"

describe("fail", () => {
    it("builds an H3 error carrying the code", () => {
        const error = fail(403, "auth.forbidden")
        expect(error.statusCode).toBe(403)
        expect(error.message).toBe("auth.forbidden")
        expect(error.data).toEqual({ code: "auth.forbidden" })
    })
    it("uses the given message when present", () => {
        expect(fail(409, "users.last_admin", "Cannot remove the last admin").message).toBe(
            "Cannot remove the last admin",
        )
    })
})
