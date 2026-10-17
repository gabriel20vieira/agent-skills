#!/usr/bin/env node
// Copies a module's new files into a project and merges its i18n keys.
//
//   node apply-module.mjs <module> [project-dir]     (project defaults to the current folder)
//
// Never overwrites: an existing file or i18n key is reported and left alone. Edits to core
// files (permissions, settings, navigation, ...) are listed in the module's skill. When the
// project has docs/settings.md, the module is added to its `modules.installed` row.
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs"
import { dirname, join, relative, resolve } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"

const here = dirname(fileURLToPath(import.meta.url))
export const MODULES_DIR = resolve(here, "../../../modules")

function listFiles(dir) {
    const out = []
    const walk = (current) => {
        for (const entry of readdirSync(current)) {
            const path = join(current, entry)
            if (statSync(path).isDirectory()) walk(path)
            else out.push(path)
        }
    }
    if (existsSync(dir)) walk(dir)
    return out
}

/** Adds keys from `source` that `target` lacks; returns the dotted keys that already existed. */
export function mergeMissing(target, source, prefix = "") {
    const skipped = []
    for (const [key, value] of Object.entries(source)) {
        const path = prefix ? `${prefix}.${key}` : key
        if (value && typeof value === "object" && !Array.isArray(value)) {
            if (target[key] === undefined) target[key] = {}
            if (typeof target[key] !== "object") {
                skipped.push(path)
                continue
            }
            skipped.push(...mergeMissing(target[key], value, path))
        }
        else if (target[key] === undefined) target[key] = value
        else if (target[key] !== value) skipped.push(path)
    }
    return skipped
}

const INSTALLED_ROW = /^(\|\s*`modules\.installed`\s*\|)([^|]*)(\|.*)$/m

/** Adds `name` to the `modules.installed` row of a settings table; null when there is no such row. */
export function recordModule(text, name) {
    const match = text.match(INSTALLED_ROW)
    if (!match) return null
    const names = new Set([...match[2].matchAll(/`([^`]+)`/g)].map(found => found[1]).filter(found => found !== "none"))
    names.add(name)
    const value = [...names].sort().map(found => "`" + found + "`").join(", ")
    return text.replace(INSTALLED_ROW, (_, start, _value, end) => `${start} ${value} ${end}`)
}

export function applyModule(name, project, { modulesDir = MODULES_DIR } = {}) {
    const moduleDir = join(modulesDir, name)
    if (!existsSync(moduleDir)) {
        const known = existsSync(modulesDir) ? readdirSync(modulesDir).filter(entry => statSync(join(modulesDir, entry)).isDirectory()) : []
        throw new Error(`Unknown module "${name}". Available: ${known.join(", ")}`)
    }
    if (!existsSync(join(project, "package.json"))) throw new Error(`Not a project folder: ${project}`)

    const result = { copied: [], existing: [], i18nSkipped: [], settings: null }
    const filesDir = join(moduleDir, "files")
    for (const source of listFiles(filesDir)) {
        const rel = relative(filesDir, source)
        const target = join(project, rel)
        if (existsSync(target)) {
            result.existing.push(rel)
            continue
        }
        mkdirSync(dirname(target), { recursive: true })
        cpSync(source, target)
        result.copied.push(rel)
    }

    for (const file of listFiles(join(moduleDir, "i18n"))) {
        const locale = join(project, "i18n", "locales", file.slice(join(moduleDir, "i18n").length + 1))
        if (!existsSync(locale)) throw new Error(`Locale not found in project: ${locale}`)
        const current = JSON.parse(readFileSync(locale, "utf8"))
        const skipped = mergeMissing(current, JSON.parse(readFileSync(file, "utf8")))
        writeFileSync(locale, JSON.stringify(current, null, 4) + "\n")
        result.i18nSkipped.push(...skipped.map(key => `${relative(project, locale)}: ${key}`))
    }

    const settings = join(project, "docs", "settings.md")
    if (existsSync(settings)) {
        const updated = recordModule(readFileSync(settings, "utf8"), name)
        if (updated !== null) {
            writeFileSync(settings, updated)
            result.settings = "docs/settings.md"
        }
    }
    return result
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
    const [name, project = "."] = process.argv.slice(2)
    try {
        if (!name) throw new Error("Usage: node apply-module.mjs <module> [project-dir]")
        const result = applyModule(name, resolve(project))
        for (const file of result.copied) console.log(`+ ${file}`)
        for (const file of result.existing) console.log(`= ${file} (exists, left alone)`)
        for (const key of result.i18nSkipped) console.log(`! ${key} (already set, left alone)`)
        if (result.settings) console.log(`~ ${result.settings} (modules.installed)`)
        console.log(`Applied ${name}. Now make the core edits listed in the web-${name} skill.`)
    }
    catch (error) {
        console.error(error.message)
        process.exit(1)
    }
}
