/**
 * One app-wide time zone (NUXT_PUBLIC_TIMEZONE). The server cannot know the visitor's
 * zone, so formatting with each side's local zone renders different times and breaks
 * hydration; everyone sees the app's zone instead.
 */
const numberFormats = {
    decimal: { style: "decimal", maximumFractionDigits: 2 },
    currency: { style: "currency", currency: "EUR" },
    percent: { style: "percent", maximumFractionDigits: 1 },
} satisfies Record<string, Intl.NumberFormatOptions>

export default defineI18nConfig(() => {
    const timeZone = useRuntimeConfig().public.timezone || "UTC"
    const datetimeFormats = {
        short: { day: "2-digit", month: "2-digit", year: "numeric", timeZone },
        long: { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone },
        time: { hour: "2-digit", minute: "2-digit", timeZone },
    } satisfies Record<string, Intl.DateTimeFormatOptions>

    return {
        fallbackLocale: "pt-PT",
        numberFormats: {
            "pt-PT": numberFormats,
            "en-US": numberFormats,
        },
        datetimeFormats: {
            "pt-PT": datetimeFormats,
            "en-US": datetimeFormats,
        },
    }
})
