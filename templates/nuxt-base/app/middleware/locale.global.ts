/**
 * Locale precedence: forced by an admin > the user's preference > cookie/browser
 * (handled by @nuxtjs/i18n). Runs after auth.global, so both states are loaded.
 */
export default defineNuxtRouteMiddleware(async () => {
    const { $i18n } = useNuxtApp()
    const forced = usePublicSettings().settings.value?.["i18n.forcedLocale"]
    const preferred = useSession().user.value?.locale
    const wanted = forced ?? preferred
    const available = $i18n.availableLocales as string[]
    if (wanted && available.includes(wanted) && $i18n.locale.value !== wanted) {
        await $i18n.setLocale(wanted as typeof $i18n.locale.value)
    }
})
