import tailwindcss from "@tailwindcss/vite"
import pkg from "./package.json" with { type: "json" }

export default defineNuxtConfig({
    modules: ["@nuxt/eslint", "shadcn-nuxt", "@nuxtjs/color-mode", "@nuxtjs/i18n"],
    devtools: { enabled: true },
    css: ["~/assets/css/main.css"],
    colorMode: {
        classSuffix: "",
        preference: "system",
        fallback: "light",
        // A cookie, not localStorage, so SSR renders the right class and the page never flashes.
        storage: "cookie",
    },
    runtimeConfig: {
        public: {
            // NUXT_PUBLIC_APP_NAME
            appName: "Nuxt Base",
            // Baked at build time; shown by /api/health.
            appVersion: pkg.version,
        },
    },
    compatibilityDate: "2026-09-01",
    nitro: { preset: "node-server" },
    vite: { plugins: [tailwindcss()] },
    eslint: {
        config: {
            stylistic: { indent: 4, quotes: "double", semi: false },
        },
    },
    i18n: {
        // Absolute site URL for SEO links; override with NUXT_PUBLIC_I18N_BASE_URL.
        baseUrl: "http://localhost:3000",
        defaultLocale: "pt-PT",
        strategy: "no_prefix",
        locales: [
            { code: "pt-PT", language: "pt-PT", name: "Português", file: "pt-PT.json" },
            { code: "en-US", language: "en-US", name: "English", file: "en-US.json" },
        ],
        detectBrowserLanguage: {
            useCookie: true,
            cookieKey: "i18n_locale",
            fallbackLocale: "pt-PT",
        },
    },
    shadcn: { prefix: "", componentDir: "./app/components/ui" },
})
