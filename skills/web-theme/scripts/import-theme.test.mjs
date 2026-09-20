// node --test skills/web-theme/scripts/import-theme.test.mjs
import assert from "node:assert/strict"
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { after, test } from "node:test"
import { addImport, addToRegistry, importTheme, parseThemeSource, swatchOf, themeCss, webFonts } from "./import-theme.mjs"

const root = mkdtempSync(join(tmpdir(), "import-theme-"))
after(() => rmSync(root, { recursive: true, force: true }))

const registry = JSON.stringify({
    name: "claude",
    cssVars: {
        theme: { "font-sans": "Poppins, sans-serif", "radius": "0.5rem", "tracking-tight": "calc(var(--tracking-normal) - 0.025em)" },
        light: { background: "oklch(0.98 0 95)", primary: "oklch(0.61 0.13 39)", "shadow-color": "hsl(0 0% 0%)", "shadow-sm": "0 1px 3px 0 hsl(0 0% 0% / 0.1)" },
        dark: { background: "oklch(0.27 0 106)", primary: "oklch(0.67 0.13 38)" },
    },
})

test("parseThemeSource reads a registry JSON and drops globally managed keys", () => {
    const blocks = parseThemeSource(registry)
    assert.equal(blocks.light.primary, "oklch(0.61 0.13 39)")
    // cssVars.theme applies to both modes.
    assert.equal(blocks.light["font-sans"], "Poppins, sans-serif")
    assert.equal(blocks.light.radius, "0.5rem")
    assert.equal(blocks.light["shadow-sm"], "0 1px 3px 0 hsl(0 0% 0% / 0.1)")
    assert.equal(blocks.light["tracking-tight"], undefined)
    assert.equal(blocks.light["shadow-color"], undefined)
    assert.equal(blocks.dark.background, "oklch(0.27 0 106)")
})

test("parseThemeSource reads plain CSS and ignores @theme blocks", () => {
    const css = `@layer base {\n:root {\n  --background: #fff;\n  --primary: #123456;\n}\n.dark {\n  --background: #000;\n}\n}\n@theme inline {\n  --color-primary: var(--primary);\n}`
    const blocks = parseThemeSource(css)
    assert.deepEqual(blocks.light, { background: "#fff", primary: "#123456" })
    assert.deepEqual(blocks.dark, { background: "#000" })
})

test("themeCss scopes both modes to the theme name", () => {
    const css = themeCss("brand", { light: { primary: "#111" }, dark: { primary: "#eee" } }, "./brand.css")
    assert.match(css, /:root\[data-theme="brand"\] \{\n {4}--primary: #111;\n\}/)
    assert.match(css, /:root\[data-theme="brand"\]\.dark \{\n {4}--primary: #eee;\n\}/)
    assert.match(css, /imported from \.\/brand\.css/)
})

test("swatchOf and webFonts report the picker colour and fonts to install", () => {
    const blocks = parseThemeSource(registry)
    assert.equal(swatchOf(blocks), "oklch(0.61 0.13 39)")
    assert.deepEqual(webFonts(blocks), ["Poppins"])
    assert.deepEqual(webFonts({ light: { "font-sans": "ui-sans-serif, system-ui" }, dark: {} }), [])
})

test("addImport and addToRegistry are idempotent", () => {
    const main = `@import "tailwindcss";\n@import "./themes/ocean.css";\n@import "./themes/amber.css";\n\n:root {}\n`
    const once = addImport(main, "brand")
    assert.match(once, /amber\.css";\n@import "\.\/themes\/brand\.css";/)
    assert.equal(addImport(once, "brand"), once)

    const themes = `export const THEMES = [\n    { name: "default", swatch: "oklch(0.205 0 0)" },\n] as const\n`
    const added = addToRegistry(themes, "brand", "#111")
    assert.match(added, /\{ name: "brand", swatch: "#111" \},\n\] as const/)
    assert.equal(addToRegistry(added, "brand", "#111"), added)
})

test("importTheme writes the file and wires it up", async () => {
    const project = join(root, "project")
    mkdirSync(join(project, "app/assets/css/themes"), { recursive: true })
    mkdirSync(join(project, "shared/utils"), { recursive: true })
    writeFileSync(join(project, "app/assets/css/main.css"), `@import "tailwindcss";\n@import "./themes/ocean.css";\n`)
    writeFileSync(join(project, "shared/utils/themes.ts"), `export const THEMES = [\n    { name: "default", swatch: "oklch(0.205 0 0)" },\n] as const\n`)
    const source = join(root, "claude.json")
    writeFileSync(source, registry)

    const result = await importTheme({ name: "claude", from: source, project })
    assert.deepEqual(result.fonts, ["Poppins"])
    assert.match(readFileSync(join(project, "app/assets/css/themes/claude.css"), "utf8"), /:root\[data-theme="claude"\]/)
    assert.match(readFileSync(join(project, "app/assets/css/main.css"), "utf8"), /@import "\.\/themes\/claude\.css";/)
    assert.match(readFileSync(join(project, "shared/utils/themes.ts"), "utf8"), /name: "claude"/)

    await assert.rejects(() => importTheme({ name: "Bad Name", from: source, project }), /lower case/)
    await assert.rejects(() => importTheme({ name: "x", from: source, project: root }), /Not a web-foundation project/)
})
