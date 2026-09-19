import { createError } from "h3"

/** The one way handlers raise errors: `throw fail(403, "auth.forbidden")`. */
export function fail(statusCode: number, code: string, message?: string) {
    return createError({ statusCode, message: message ?? code, data: { code } })
}
