let baseUrl = ""

/** Each test file points the clients at the server it started (see server.ts). */
export function setBaseUrl(url: string) {
    baseUrl = url
}

export function url(path: string) {
    return baseUrl + path
}

export interface ApiResponse<T = any> {
    status: number
    data: T
    code: string | undefined
}

/** A fetch client with its own cookie jar: one per simulated browser. */
export function createClient() {
    const jar = new Map<string, string>()

    async function request<T = any>(method: string, path: string, body?: unknown): Promise<ApiResponse<T>> {
        const response = await fetch(url(path), {
            method,
            redirect: "manual",
            headers: {
                "content-type": "application/json",
                "cookie": [...jar].map(([name, value]) => `${name}=${value}`).join("; "),
            },
            body: body === undefined ? undefined : JSON.stringify(body),
        })
        for (const header of response.headers.getSetCookie()) {
            const pair = header.split(";")[0]!
            const index = pair.indexOf("=")
            const name = pair.slice(0, index)
            const value = pair.slice(index + 1)
            const expired = !value || /max-age=0/i.test(header) || /expires=thu, 01 jan 1970/i.test(header)
            if (expired) jar.delete(name)
            else jar.set(name, value)
        }
        const text = await response.text()
        let data: any = text
        try {
            data = JSON.parse(text)
        }
        catch {
            // not JSON
        }
        return { status: response.status, data, code: data?.data?.code }
    }

    return {
        jar,
        get: <T = any>(path: string) => request<T>("GET", path),
        post: <T = any>(path: string, body: unknown = {}) => request<T>("POST", path, body),
        patch: <T = any>(path: string, body: unknown) => request<T>("PATCH", path, body),
        put: <T = any>(path: string, body: unknown) => request<T>("PUT", path, body),
        delete: <T = any>(path: string) => request<T>("DELETE", path),
    }
}

export type Client = ReturnType<typeof createClient>
