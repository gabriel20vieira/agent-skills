import { settings } from "../db/schema"

const TTL_MS = 30_000
let cache: { at: number, values: Map<string, unknown> } | undefined

async function load(): Promise<Map<string, unknown>> {
    if (cache && Date.now() - cache.at < TTL_MS) return cache.values
    try {
        const rows = await useDb().select().from(settings)
        cache = { at: Date.now(), values: new Map(rows.map(row => [row.key, row.value])) }
        return cache.values
    }
    catch {
        // Database down: serve defaults (uncached) so health, maintenance and rate limits
        // keep answering instead of failing every request.
        return new Map()
    }
}

/** Precedence: database row (if it still validates) > default in shared/utils/settings. */
export async function getSetting<K extends SettingKey>(key: K): Promise<SettingValue<K>> {
    const values = await load()
    const definition = SETTINGS[key]
    if (values.has(key)) {
        const parsed = definition.schema.safeParse(values.get(key))
        if (parsed.success) return parsed.data as SettingValue<K>
    }
    return definition.default as SettingValue<K>
}

export async function getAllSettings(): Promise<Record<SettingKey, unknown>> {
    const entries = await Promise.all(
        (Object.keys(SETTINGS) as SettingKey[]).map(async key => [key, await getSetting(key)] as const),
    )
    return Object.fromEntries(entries) as Record<SettingKey, unknown>
}

export async function getPublicSettings(): Promise<Record<string, unknown>> {
    const all = await getAllSettings()
    return Object.fromEntries(
        (Object.keys(SETTINGS) as SettingKey[]).filter(key => SETTINGS[key].public).map(key => [key, all[key]]),
    )
}

export async function setSetting(key: SettingKey, value: unknown): Promise<unknown> {
    const parsed = SETTINGS[key].schema.safeParse(value)
    if (!parsed.success) throw fail(400, "settings.invalid")
    await useDb()
        .insert(settings)
        .values({ key, value: parsed.data })
        .onDuplicateKeyUpdate({ set: { value: parsed.data } })
    invalidateSettings()
    if (SETTINGS[key].public) realtime.publish(SYSTEM_TOPIC, "settings.updated", { key })
    if (key === "maintenance.enabled") realtime.publish(SYSTEM_TOPIC, "system.maintenance", { enabled: parsed.data })
    return parsed.data
}

export function invalidateSettings() {
    cache = undefined
}
