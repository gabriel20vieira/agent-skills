export interface ApiErrorInfo {
    status: number
    code: string
    message: string
}

interface FetchErrorLike {
    statusCode?: number
    status?: number
    message?: string
    data?: { statusCode?: number, message?: string, data?: { code?: string } }
}

/**
 * Reads the envelope every API error uses: createError({ statusCode, message, data: { code } }).
 * The client translates `code`; `message` is only a fallback.
 */
export function extractApiError(error: unknown): ApiErrorInfo {
    const err = (error && typeof error === "object" ? error : {}) as FetchErrorLike
    const status = err.statusCode ?? err.status ?? err.data?.statusCode ?? 0
    const fallback = status === 0 ? "network.unreachable" : "errors.unknown"
    return {
        status,
        code: err.data?.data?.code ?? fallback,
        message: err.data?.message ?? err.message ?? "",
    }
}
