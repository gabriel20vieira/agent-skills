/** Only the keys marked public are present. */
type PublicSettings = { [K in SettingKey]?: SettingValue<K> }

/** Public settings (maintenance, default theme, forced locale), fetched once per app load. */
export function usePublicSettings() {
    const settings = useState<PublicSettings | null>("settings:public", () => null)
    const fetcher = useRequestFetch()

    async function refresh() {
        settings.value = await fetcher<PublicSettings>("/api/settings/public").catch(() => null)
    }

    async function ensure() {
        if (!settings.value) await refresh()
    }

    return { settings, refresh, ensure }
}
