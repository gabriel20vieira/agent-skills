/**
 * Public, indexable pages. Feeds /sitemap.xml and /llms.txt; each page also calls
 * usePageSeo with the same keys. Add an entry for every new public page.
 */
export interface PublicPage {
    path: string
    /** i18n keys for the page's title and meta description. */
    titleKey: string
    descriptionKey: string
    changefreq?: "daily" | "weekly" | "monthly" | "yearly"
    priority?: number
    /** One English line for /llms.txt (machines read it, not visitors). Omit to leave the page out. */
    summary?: string
}

export const PUBLIC_PAGES: PublicPage[] = [
    { path: "/", titleKey: "home.title", descriptionKey: "home.subtitle", changefreq: "weekly", priority: 1, summary: "Home page: what this site is about." },
    { path: "/sobre", titleKey: "about.title", descriptionKey: "about.description", changefreq: "monthly", priority: 0.7, summary: "About: who runs this site and how to get in touch." },
    { path: "/privacidade", titleKey: "privacy.title", descriptionKey: "privacy.intro", changefreq: "yearly", priority: 0.3 },
]

/** Areas crawlers should not visit (robots.txt). */
export const PRIVATE_PREFIXES = ["/api/", "/app", "/admin", "/conta", "/entrar", "/setup", "/convite", "/_ws"]
