import { z } from "zod"
import { THEMES } from "./themes"

interface SettingDefinition<T> {
    schema: z.ZodType<T>
    default: T
    /** Exposed by GET /api/settings/public (no secrets here, ever). */
    public: boolean
}

function define<T>(schema: z.ZodType<T>, value: T, isPublic = false): SettingDefinition<T> {
    return { schema, default: value, public: isPublic }
}

/**
 * Every runtime-editable setting. Precedence when read: database row > this default.
 * Modules add their keys here.
 */
export const SETTINGS = {
    "security.login": define(
        z.object({ limit: z.number().int().min(1).max(1000), windowMinutes: z.number().int().min(1).max(1440) }),
        { limit: 8, windowMinutes: 5 },
    ),
    "security.api": define(
        z.object({ limit: z.number().int().min(10).max(100000), windowSeconds: z.number().int().min(1).max(3600) }),
        { limit: 300, windowSeconds: 60 },
    ),
    "appearance.defaultTheme": define(z.enum(THEMES.map(theme => theme.name) as [string, ...string[]]), "default", true),
    "appearance.userThemes": define(z.boolean(), true, true),
    "i18n.forcedLocale": define(z.enum(["pt-PT", "en-US"]).nullable(), null, true),
    "maintenance.enabled": define(z.boolean(), false, true),
    "maintenance.message": define(z.string().max(500), "", true),
} as const

export type SettingKey = keyof typeof SETTINGS
export type SettingValue<K extends SettingKey> = z.infer<(typeof SETTINGS)[K]["schema"]>

export function isSettingKey(key: string): key is SettingKey {
    return Object.hasOwn(SETTINGS, key)
}
