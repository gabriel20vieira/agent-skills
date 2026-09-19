// Manifest colours must be plain CSS colours browsers parse everywhere (hex), not oklch();
// the page's <meta name="theme-color"> (app.vue) follows light/dark mode.
const BACKGROUND = "#ffffff"

export default defineEventHandler((event) => {
    const config = useRuntimeConfig(event)
    setResponseHeader(event, "Content-Type", "application/manifest+json; charset=utf-8")
    setResponseHeader(event, "Cache-Control", "public, max-age=3600")
    return {
        name: config.public.appName,
        short_name: config.public.appName.slice(0, 12),
        id: "/app",
        start_url: "/app",
        scope: "/",
        display: "standalone",
        background_color: BACKGROUND,
        theme_color: BACKGROUND,
        icons: [
            { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
            { src: "/icon.svg?maskable=1", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
        ],
    }
})
