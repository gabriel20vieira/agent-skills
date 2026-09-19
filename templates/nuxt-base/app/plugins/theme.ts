/** data-theme on <html> and a favicon tinted with the theme's primary colour (SSR too). */
export default defineNuxtPlugin(() => {
    const { theme } = useAppTheme()
    const config = useRuntimeConfig()

    const favicon = computed(() => {
        const colour = THEMES.find(item => item.name === theme.value)?.swatch ?? THEMES[0].swatch
        const letter = (config.public.appName.trim()[0] ?? "A").toUpperCase()
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">`
            + `<rect width="32" height="32" rx="8" fill="${colour}"/>`
            + `<text x="16" y="22" font-family="system-ui,sans-serif" font-size="18" font-weight="700" `
            + `text-anchor="middle" fill="white">${letter}</text></svg>`
        return `data:image/svg+xml,${encodeURIComponent(svg)}`
    })

    useHead({
        htmlAttrs: { "data-theme": theme },
        link: [{ key: "favicon", rel: "icon", type: "image/svg+xml", href: favicon }],
    })
})
