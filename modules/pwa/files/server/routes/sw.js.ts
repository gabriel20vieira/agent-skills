// The service worker, versioned by the app version so each release gets a fresh cache.
// - Hashed build assets (/_nuxt/): cache first (their names change on every build).
// - Page navigations: network first; offline, the /offline page cached at install.
// - /api and /_ws: never touched (per-user data must not be cached).
function serviceWorker(version: string) {
    return `const CACHE = "app-${version}"
const OFFLINE = "/offline"

self.addEventListener("install", (event) => {
    event.waitUntil((async () => {
        const cache = await caches.open(CACHE)
        // Without credentials: the cached page must not carry anyone's session data.
        const response = await fetch(OFFLINE, { credentials: "omit" })
        if (response.ok) await cache.put(OFFLINE, response)
        await self.skipWaiting()
    })())
})

self.addEventListener("activate", (event) => {
    event.waitUntil((async () => {
        for (const key of await caches.keys()) {
            if (key !== CACHE) await caches.delete(key)
        }
        await self.clients.claim()
    })())
})

self.addEventListener("fetch", (event) => {
    const request = event.request
    const url = new URL(request.url)
    if (request.method !== "GET" || url.origin !== self.location.origin) return
    if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/_ws")) return

    if (request.mode === "navigate") {
        event.respondWith(fetch(request).catch(async () => (await caches.match(OFFLINE)) ?? Response.error()))
        return
    }
    if (url.pathname.startsWith("/_nuxt/")) {
        event.respondWith((async () => {
            const cache = await caches.open(CACHE)
            const cached = await cache.match(request)
            if (cached) return cached
            const response = await fetch(request)
            if (response.ok) cache.put(request, response.clone())
            return response
        })())
    }
})
`
}

export default defineEventHandler((event) => {
    const version = String(useRuntimeConfig(event).public.appVersion || "dev").replace(/[^\w.-]/g, "")
    setResponseHeader(event, "Content-Type", "application/javascript; charset=utf-8")
    // Browsers re-check the worker on navigation; never let a proxy pin an old one.
    setResponseHeader(event, "Cache-Control", "no-cache")
    setResponseHeader(event, "Service-Worker-Allowed", "/")
    return serviceWorker(version)
})
