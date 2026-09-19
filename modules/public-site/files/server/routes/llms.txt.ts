import { PUBLIC_PAGES } from "#shared/utils/publicPages"

// https://llmstxt.org: a short, plain map of the public site for language models.
export default defineEventHandler((event) => {
    const config = useRuntimeConfig(event)
    const base = String(config.public.i18n?.baseUrl || getRequestURL(event).origin).replace(/\/$/, "")
    const pages = PUBLIC_PAGES.filter(page => page.summary)
        .map(page => `- [${page.path}](${base}${page.path === "/" ? "/" : page.path}): ${page.summary}`)
    setResponseHeader(event, "Content-Type", "text/plain; charset=utf-8")
    return [`# ${config.public.appName}`, "", "## Pages", "", ...pages, ""].join("\n")
})
