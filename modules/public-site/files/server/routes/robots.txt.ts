import { PRIVATE_PREFIXES } from "#shared/utils/publicPages"

export default defineEventHandler((event) => {
    const base = String(useRuntimeConfig(event).public.i18n?.baseUrl || getRequestURL(event).origin).replace(/\/$/, "")
    setResponseHeader(event, "Content-Type", "text/plain; charset=utf-8")
    return [
        "User-agent: *",
        ...PRIVATE_PREFIXES.map(prefix => `Disallow: ${prefix}`),
        "",
        `Sitemap: ${base}/sitemap.xml`,
        "",
    ].join("\n")
})
