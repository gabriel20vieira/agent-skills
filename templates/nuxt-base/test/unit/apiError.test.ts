import { describe, expect, it } from "vitest"
import { extractApiError } from "../../shared/utils/apiError"

describe("extractApiError", () => {
    it("reads status, code and message from an ofetch error", () => {
        const error = {
            statusCode: 403,
            data: { statusCode: 403, message: "Forbidden", data: { code: "auth.forbidden" } },
        }
        expect(extractApiError(error)).toEqual({ status: 403, code: "auth.forbidden", message: "Forbidden" })
    })
    it("falls back to errors.unknown when the body has no code", () => {
        const error = { statusCode: 500, data: { message: "boom" } }
        expect(extractApiError(error)).toEqual({ status: 500, code: "errors.unknown", message: "boom" })
    })
    it("maps a missing status to network.unreachable", () => {
        expect(extractApiError(new Error("fetch failed"))).toEqual({
            status: 0,
            code: "network.unreachable",
            message: "fetch failed",
        })
    })
    it("survives non-objects", () => {
        expect(extractApiError(undefined)).toEqual({ status: 0, code: "network.unreachable", message: "" })
    })
})
