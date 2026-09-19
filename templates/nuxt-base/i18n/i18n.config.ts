export default defineI18nConfig(() => ({
    fallbackLocale: "pt-PT",
    numberFormats: {
        "pt-PT": {
            decimal: { style: "decimal", maximumFractionDigits: 2 },
            currency: { style: "currency", currency: "EUR" },
            percent: { style: "percent", maximumFractionDigits: 1 },
        },
        "en-US": {
            decimal: { style: "decimal", maximumFractionDigits: 2 },
            currency: { style: "currency", currency: "EUR" },
            percent: { style: "percent", maximumFractionDigits: 1 },
        },
    },
    datetimeFormats: {
        "pt-PT": {
            short: { day: "2-digit", month: "2-digit", year: "numeric" },
            long: { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" },
            time: { hour: "2-digit", minute: "2-digit" },
        },
        "en-US": {
            short: { day: "2-digit", month: "2-digit", year: "numeric" },
            long: { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" },
            time: { hour: "2-digit", minute: "2-digit" },
        },
    },
}))
