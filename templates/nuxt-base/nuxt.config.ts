import tailwindcss from "@tailwindcss/vite"
import pkg from "./package.json" with { type: "json" }

export default defineNuxtConfig({
    modules: ["@nuxt/eslint", "shadcn-nuxt", "@nuxtjs/color-mode", "@nuxtjs/i18n", "nuxt-auth-utils"],
    // Foundation components are used as <PageHeader>, <DataTable>, ... (no "App" prefix).
    components: [{ path: "~/components/app", pathPrefix: false }, "~/components"],
    devtools: { enabled: true },
    css: ["~/assets/css/main.css", "vue-sonner/style.css"],
    colorMode: {
        classSuffix: "",
        preference: "system",
        fallback: "light",
        // A cookie, not localStorage, so SSR renders the right class and the page never flashes.
        storage: "cookie",
    },
    runtimeConfig: {
        // NUXT_SESSION_PASSWORD seals the cookie. maxAge is the ceiling; each login picks
        // 30 days (remember me) or 1 day, enforced by the sessions table.
        session: {
            maxAge: 60 * 60 * 24 * 30,
            cookie: { sameSite: "lax" },
        },
        // NUXT_SETUP_CODE gates the first-admin screen. Empty = setup disabled (fail closed).
        setupCode: "",
        // NUXT_TRUST_PROXY: honour X-Forwarded-For. Only behind a proxy you control.
        trustProxy: false,
        public: {
            // NUXT_PUBLIC_APP_NAME
            appName: "Nuxt Base",
            // Baked at build time; shown by /api/health.
            appVersion: pkg.version,
            // NUXT_PUBLIC_TIMEZONE: the zone every date is formatted in, on both sides.
            // A per-visitor zone would make SSR and the browser disagree (hydration).
            timezone: "Europe/Lisbon",
        },
    },
    compatibilityDate: "2026-09-01",
    nitro: {
        preset: "node-server",
        // WebSocket on the same port (server/routes/_ws.ts); no second port to proxy.
        experimental: { websocket: true },
    },
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
