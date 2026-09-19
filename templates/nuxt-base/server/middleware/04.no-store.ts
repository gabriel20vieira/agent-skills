export default defineEventHandler((event) => {
    // API responses carry per-user data; never let a browser or proxy cache them.
    if (event.path.startsWith("/api/")) {
        setResponseHeader(event, "Cache-Control", "no-store")
    }
})
