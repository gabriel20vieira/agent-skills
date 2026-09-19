import { THEMES } from "#shared/utils/themes"

// The app icon: the first letter of the app name on the default theme's colour.
// Replace with a designed icon (public/icon.svg + a PNG set) when the project has one.
export default defineEventHandler(async (event) => {
    const config = useRuntimeConfig(event)
    const theme = await getSetting("appearance.defaultTheme")
    const colour = THEMES.find(item => item.name === theme)?.swatch ?? THEMES[0].swatch
    const letter = (config.public.appName.trim()[0] ?? "A").toUpperCase().replace(/[<>&"']/g, "")
    // Maskable icons need the content inside the central 80% safe zone and no rounded corners.
    const maskable = getQuery(event).maskable !== undefined
    setResponseHeader(event, "Content-Type", "image/svg+xml")
    setResponseHeader(event, "Cache-Control", "public, max-age=86400")
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">`
        + `<rect width="512" height="512" rx="${maskable ? 0 : 112}" fill="${colour}"/>`
        + `<text x="256" y="${maskable ? 330 : 350}" font-family="system-ui,sans-serif" font-size="${maskable ? 220 : 290}" `
        + `font-weight="700" text-anchor="middle" fill="white">${letter}</text></svg>`
})
