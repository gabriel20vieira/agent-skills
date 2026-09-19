import { createError } from "h3"

/**
 * The one way handlers raise errors: `throw fail(403, "auth.forbidden")`.
 * `extra` travels next to the code in `data` (e.g. validation issues).
 */
export function fail(statusCode: number, code: string, message?: string, extra?: Record<string, unknown>) {
    return createError({ statusCode, message: message ?? code, data: { ...extra, code } })
}
