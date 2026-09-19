import type { H3Event } from "h3"
import type { z } from "zod"

function invalid(error: z.ZodError) {
    const issues = error.issues.map(issue => ({ path: issue.path.join("."), code: issue.code }))
    return fail(400, "validation.invalid", "Invalid input", { issues })
}

/** readBody + zod, raising the standard envelope (`validation.invalid` + issues). */
export async function readBodyWith<T extends z.ZodType>(event: H3Event, schema: T): Promise<z.infer<T>> {
    const result = schema.safeParse(await readBody(event).catch(() => undefined))
    if (!result.success) throw invalid(result.error)
    return result.data
}

export function readQueryWith<T extends z.ZodType>(event: H3Event, schema: T): z.infer<T> {
    const result = schema.safeParse(getQuery(event))
    if (!result.success) throw invalid(result.error)
    return result.data
}

/** Positive integer route param, or 404 with `notFoundCode`. */
export function readIdParam(event: H3Event, notFoundCode: string, name = "id"): number {
    const value = Number(getRouterParam(event, name))
    if (!Number.isInteger(value) || value <= 0) throw fail(404, notFoundCode)
    return value
}
