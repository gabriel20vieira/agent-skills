#!/usr/bin/env node
// Imports a tweakcn (or any shadcn) theme into a web-foundation project as a
// [data-theme] file, and registers it.
//
//   node import-theme.mjs --name claude --from https://tweakcn.com/r/themes/claude.json
//   node import-theme.mjs --name brand --from ./brand.css [--project .]
//
// Accepts a shadcn registry JSON (tweakcn's "Code" tab links one) or plain CSS with
// :root { ... } and .dark { ... } blocks. Prints what is left to do by hand.
import { existsSync, readFileSync, writeFileSync } from "node:fs"
import { join, resolve } from "node:path"
import { pathToFileURL } from "node:url"

/** Handled globally by main.css (@theme inline), so a theme must not redefine them. */
const SKIP_KEYS = new Set([
    "tracking-tighter", "tracking-tight", "tracking-wide", "tracking-wider", "tracking-widest",
    "letter-spacing", "shadow-color", "shadow-opacity", "shadow-blur", "shadow-spread",
    "shadow-offset-x", "shadow-offset-y",
])

const SYSTEM_FONTS = /^(ui-|system-ui|-apple-system|BlinkMacSystemFont|sans-serif|serif|monospace|inherit)/

export function parseArgs(argv) {
    const args = {}
    for (let i = 0; i < argv.length; i++) {
        const key = argv[i]
        if (!key.startsWith("--")) throw new Error(`Unexpected argument: ${key}`)
        args[key.slice(2)] = argv[++i]
    }
    return args
}

function cleanBlock(entries) {
    const out = {}
    for (const [rawKey, rawValue] of entries) {
        const key = rawKey.trim().replace(/^--/, "")
        const value = String(rawValue).trim().replace(/;$/, "")
        if (!key || !value || SKIP_KEYS.has(key)) continue
        out[key] = value
    }
    return out
}

/** Declarations of the first `selector { ... }` block, ignoring @theme/@layer wrappers. */
function cssBlock(css, selector) {
    const pattern = new RegExp(`(^|[}\\s])${selector.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\\\$&")}\\s*\\{([^}]*)\\}`, "m")
    const match = pattern.exec(css)
    if (!match) return {}
    return cleanBlock(match[2].split(";").filter(line => line.includes(":")).map(line => {
        const index = line.indexOf(":")
        return [line.slice(0, index), line.slice(index + 1)]
    }))
}

/** Registry JSON or CSS text -> { light, dark } blocks of plain custom properties. */
export function parseThemeSource(text) {
    const trimmed = text.trim()
    if (trimmed.startsWith("{")) {
        const json = JSON.parse(trimmed)
        const vars = json.cssVars ?? {}
        // cssVars.theme holds non-colour tokens (fonts, radius); they belong to both modes.
        const shared = cleanBlock(Object.entries(vars.theme ?? {}))
        return {
            light: { ...shared, ...cleanBlock(Object.entries(vars.light ?? {})) },
            dark: cleanBlock(Object.entries(vars.dark ?? {})),
        }
    }
    return { light: cssBlock(trimmed, ":root"), dark: cssBlock(trimmed, ".dark") }
}

export function themeCss(name, blocks, source = "") {
    const render = (selector, block) => [
        `${selector} {`,
        ...Object.entries(block).map(([key, value]) => `    --${key}: ${value};`),
        "}",
    ].join("\n")
    const header = `/* ${name}: imported${source ? ` from ${source}` : ""}. Edit here, not in main.css. */`
    const parts = [header, render(`:root[data-theme="${name}"]`, blocks.light)]
    if (Object.keys(blocks.dark).length) parts.push(render(`:root[data-theme="${name}"].dark`, blocks.dark))
    return `${parts.join("\n\n")}\n`
}

export function swatchOf(blocks) {
    return blocks.light.primary ?? blocks.dark.primary ?? "oklch(0.205 0 0)"
}

/** Fonts the theme asks for that the project has to install (not system stacks). */
export function webFonts(blocks) {
    const families = new Set()
    for (const block of [blocks.light, blocks.dark]) {
        for (const key of ["font-sans", "font-serif", "font-mono"]) {
            const first = block[key]?.split(",")[0]?.trim().replace(/^['"]|['"]$/g, "")
            if (first && !SYSTEM_FONTS.test(first)) families.add(first)
        }
    }
    return [...families]
}

export function addImport(mainCss, name) {
    const line = `@import "./themes/${name}.css";`
    if (mainCss.includes(line)) return mainCss
    const imports = [...mainCss.matchAll(/^@import "\.\/themes\/.*";$/gm)]
    const last = imports.at(-1)
    if (last) return mainCss.slice(0, last.index + last[0].length) + `\n${line}` + mainCss.slice(last.index + last[0].length)
    return mainCss.replace(/^(@import .*;\n)+/m, match => `${match}${line}\n`)
}

export function addToRegistry(themesTs, name, swatch) {
    if (new RegExp(`name: "${name}"`).test(themesTs)) return themesTs
    return themesTs.replace(/\n\] as const/, `\n    { name: "${name}", swatch: "${swatch}" },\n] as const`)
}

async function readSource(from) {
    if (/^https?:\/\//.test(from)) {
        const response = await fetch(from)
        if (!response.ok) throw new Error(`${from} answered ${response.status}`)
        return response.text()
    }
    return readFileSync(from, "utf8")
}

export async function importTheme({ name, from, project = "." }) {
    if (!name || !/^[a-z][a-z0-9-]*$/.test(name)) throw new Error("--name must be lower case (a-z, 0-9, -)")
    if (!from) throw new Error("--from is required (a tweakcn registry URL or a CSS file)")
    const root = resolve(project)
    const mainCssPath = join(root, "app/assets/css/main.css")
    const themesPath = join(root, "shared/utils/themes.ts")
    if (!existsSync(mainCssPath) || !existsSync(themesPath)) throw new Error(`Not a web-foundation project: ${root}`)

    const blocks = parseThemeSource(await readSource(from))
    if (!Object.keys(blocks.light).length) throw new Error("No :root / light variables found in the source")

    const file = join(root, "app/assets/css/themes", `${name}.css`)
    writeFileSync(file, themeCss(name, blocks, from))
    writeFileSync(mainCssPath, addImport(readFileSync(mainCssPath, "utf8"), name))
    writeFileSync(themesPath, addToRegistry(readFileSync(themesPath, "utf8"), name, swatchOf(blocks)))
    return { file, swatch: swatchOf(blocks), fonts: webFonts(blocks), variables: Object.keys(blocks.light).length }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
    try {
        const result = await importTheme(parseArgs(process.argv.slice(2)))
        const name = parseArgs(process.argv.slice(2)).name
        console.log(`Wrote ${result.file} (${result.variables} variables), imported it in main.css and added it to THEMES.`)
        console.log(`Still to do:\n- add "theme.names.${name}" to BOTH i18n/locales/*.json`)
        if (result.fonts.length) console.log(`- install or drop these fonts: ${result.fonts.join(", ")}`)
        console.log("- npm run check, then look at the theme in light and dark mode")
    }
    catch (error) {
        console.error(error.message)
        process.exit(1)
    }
}
