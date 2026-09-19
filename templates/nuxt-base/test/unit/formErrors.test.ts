import { describe, expect, it } from "vitest"
import { z } from "zod"
import { firstIssueByField, serverIssues, zodIssues } from "../../app/utils/formErrors"

describe("form errors", () => {
    it("keeps the first issue per field", () => {
        expect(firstIssueByField([
            { path: "title", code: "too_small" },
            { path: "title", code: "too_big" },
            { path: "email", code: "invalid_format" },
        ])).toEqual({ title: "too_small", email: "invalid_format" })
    })
    it("reads zod client-side issues", () => {
        const result = z.object({ title: z.string().min(1) }).safeParse({ title: "" })
        expect(result.success).toBe(false)
        if (!result.success) expect(zodIssues(result.error)).toEqual([{ path: "title", code: "too_small" }])
    })
    it("reads validation issues from the API envelope", () => {
        const error = { statusCode: 400, data: { data: { code: "validation.invalid", issues: [{ path: "email", code: "invalid_format" }] } } }
        expect(serverIssues(error)).toEqual([{ path: "email", code: "invalid_format" }])
    })
    it("ignores other API errors", () => {
        expect(serverIssues({ statusCode: 403, data: { data: { code: "auth.forbidden" } } })).toEqual([])
        expect(serverIssues(new Error("x"))).toEqual([])
    })
})
