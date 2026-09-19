import { PUBLIC_PAGES } from "#shared/utils/publicPages"

function escapeXml(value: string) {
    return value.replace(/[<>&'"]/g, char => `&#${char.charCodeAt(0)};`)
}

export default defineEventHandler((event) => {
    const base = String(useRuntimeConfig(event).public.i18n?.baseUrl || getRequestURL(event).origin).replace(/\/$/, "")
    const urls = PUBLIC_PAGES.map(page => [
        "  <url>",
        `    <loc>${escapeXml(base + (page.path === "/" ? "/" : page.path))}</loc>`,
        page.changefreq ? `    <changefreq>${page.changefreq}</changefreq>` : "",
        page.priority !== undefined ? `    <priority>${page.priority.toFixed(1)}</priority>` : "",
        "  </url>",
    ].filter(Boolean).join("\n"))
    setResponseHeader(event, "Content-Type", "application/xml; charset=utf-8")
    setResponseHeader(event, "Cache-Control", "public, max-age=3600")
    return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>\n`
})
