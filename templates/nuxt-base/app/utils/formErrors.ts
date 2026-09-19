import type { z } from "zod"

export interface FieldIssue {
    /** Dotted path of the field ("" for the whole form). */
    path: string
    /** zod issue code (too_small, invalid_format, ...). */
    code: string
}

export function zodIssues(error: z.ZodError): FieldIssue[] {
    return error.issues.map(issue => ({ path: issue.path.join("."), code: issue.code }))
}

/** Issues from a `validation.invalid` API error (the server runs the same schemas). */
export function serverIssues(error: unknown): FieldIssue[] {
    const data = (error as { data?: { data?: { code?: string, issues?: FieldIssue[] } } })?.data?.data
    return data?.code === "validation.invalid" && Array.isArray(data.issues) ? data.issues : []
}

/** One message per field is enough: the first problem is the one to fix. */
export function firstIssueByField(issues: FieldIssue[]): Record<string, string> {
    const byField: Record<string, string> = {}
    for (const issue of issues) byField[issue.path] ??= issue.code
    return byField
}
