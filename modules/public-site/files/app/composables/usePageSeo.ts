/**
 * Title, description, Open Graph and canonical URL for a public page, from i18n keys.
 * The canonical URL uses the i18n baseUrl (NUXT_PUBLIC_I18N_BASE_URL in production).
 */
export function usePageSeo(options: { titleKey: string, descriptionKey: string, image?: string }) {
    const { t } = useI18n()
    const route = useRoute()
    const config = useRuntimeConfig()
    const base = String(config.public.i18n?.baseUrl || "").replace(/\/$/, "")
    const url = computed(() => `${base}${route.path === "/" ? "" : route.path}` || "/")

    useSeoMeta({
        title: () => t(options.titleKey),
        description: () => t(options.descriptionKey),
        ogTitle: () => t(options.titleKey),
        ogDescription: () => t(options.descriptionKey),
        ogType: "website",
        ogUrl: url,
        ogSiteName: config.public.appName,
        ogImage: options.image,
        twitterCard: options.image ? "summary_large_image" : "summary",
    })
    useHead({ link: [{ key: "canonical", rel: "canonical", href: url }] })
}
