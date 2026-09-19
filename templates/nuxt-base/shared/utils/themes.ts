/**
 * Colour themes. Each one (except "default", which is main.css) has a file in
 * app/assets/css/themes/<name>.css scoped to :root[data-theme="<name>"]. `swatch` is its
 * primary colour, used for the picker and the favicon.
 */
export const THEMES = [
    { name: "default", swatch: "oklch(0.205 0 0)" },
    { name: "ocean", swatch: "oklch(0.55 0.17 250)" },
    { name: "amber", swatch: "oklch(0.72 0.16 65)" },
] as const

export type ThemeName = (typeof THEMES)[number]["name"]

export function isThemeName(value: unknown): value is ThemeName {
    return THEMES.some(theme => theme.name === value)
}
