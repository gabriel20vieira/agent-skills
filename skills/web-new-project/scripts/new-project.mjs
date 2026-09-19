#!/usr/bin/env node
// Copies templates/nuxt-base into a new project folder and makes it its own:
// package/compose/app names, a filled .env with fresh secrets, renamed deploy files.
//
//   node new-project.mjs --dest ../my-site --name my-site --title "My Site" [--locale en-US]
//
// Prints the setup code (for /setup) at the end. Never overwrites a non-empty folder.
import { randomBytes, randomInt } from "node:crypto"
import { cpSync, existsSync, readdirSync, readFileSync, renameSync, statSync, writeFileSync } from "node:fs"
import { basename, dirname, join, relative, resolve } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"

const here = dirname(fileURLToPath(import.meta.url))
export const DEFAULT_TEMPLATE = resolve(here, "../../../templates/nuxt-base")

// Build output, dependencies, local data and anything secret stay behind.
const SKIP = new Set(["node_modules", ".nuxt", ".output", ".data", "backups", ".env", ".playwright-mcp", "test-results", ".git"])
const TEXT = /\.(ts|mts|mjs|js|vue|json|md|ya?ml|css|sh|ps1|service|conf|example|sql|txt)$|^(Dockerfile|Caddyfile|\.env\.example|\.gitignore|\.dockerignore|\.gitattributes)$/
const LOCALES = ["pt-PT", "en-US"]

export function parseArgs(argv) {
    const args = {}
    for (let i = 0; i < argv.length; i++) {
        const key = argv[i]
        if (!key.startsWith("--")) throw new Error(`Unexpected argument: ${key}`)
        args[key.slice(2)] = argv[++i]
    }
    return args
}

export function validateOptions({ dest, name, title, locale = "pt-PT", template = DEFAULT_TEMPLATE }) {
    if (!dest) throw new Error("--dest is required")
    const slug = name ?? basename(resolve(dest))
    if (!/^[a-z][a-z0-9-]{1,38}[a-z0-9]$/.test(slug)) {
        throw new Error(`--name "${slug}" must be kebab-case (a-z, 0-9, -), 3-40 chars`)
    }
    if (!LOCALES.includes(locale)) throw new Error(`--locale must be one of ${LOCALES.join(", ")}`)
    return { dest: resolve(dest), name: slug, title: title ?? titleCase(slug), locale, template: resolve(template) }
}

function titleCase(slug) {
    return slug.split("-").map(part => part[0].toUpperCase() + part.slice(1)).join(" ")
}

/** 15 chars in groups of 5, no look-alike characters (typed by hand once). */
export function setupCode() {
    const alphabet = "23456789ABCDEFGHJKMNPQRSTUVWXYZ"
    const chars = Array.from({ length: 15 }, () => alphabet[randomInt(alphabet.length)])
    return chars.join("").match(/.{5}/g).join("-")
}

function secret(bytes) {
    return randomBytes(bytes).toString("base64url")
}

function walk(dir, visit) {
    for (const entry of readdirSync(dir)) {
        const path = join(dir, entry)
        if (statSync(path).isDirectory()) walk(path, visit)
        else visit(path)
    }
}

export function fillEnv(example, { name, title }) {
    const values = {
        COMPOSE_PROJECT_NAME: name,
        MYSQL_ROOT_PASSWORD: secret(24),
        MYSQL_PASSWORD: secret(24),
        NUXT_SESSION_PASSWORD: secret(48),
        NUXT_SETUP_CODE: setupCode(),
        NUXT_PUBLIC_APP_NAME: title,
    }
    let env = example
    for (const [key, value] of Object.entries(values)) {
        env = env.replace(new RegExp(`^${key}=.*$`, "m"), `${key}="${value}"`)
    }
    // DATABASE_URL must carry the same generated password as the compose db.
    env = env.replace(/^DATABASE_URL=mysql:\/\/app:[^@]*@/m, `DATABASE_URL=mysql://app:${values.MYSQL_PASSWORD}@`)
    return { env, setupCode: values.NUXT_SETUP_CODE }
}

export function createProject(options) {
    const { dest, name, title, locale, template } = validateOptions(options)
    if (!existsSync(join(template, "package.json"))) throw new Error(`Template not found: ${template}`)
    if (existsSync(dest) && readdirSync(dest).length > 0) throw new Error(`Destination is not empty: ${dest}`)

    cpSync(template, dest, {
        recursive: true,
        filter: source => !SKIP.has(basename(source)),
    })

    walk(dest, (path) => {
        if (!TEXT.test(basename(path))) return
        const before = readFileSync(path, "utf8")
        const after = before.replaceAll("nuxt-base", name).replaceAll("Nuxt Base", title)
        if (after !== before) writeFileSync(path, after)
        if (basename(path).includes("nuxt-base")) renameSync(path, join(dirname(path), basename(path).replace("nuxt-base", name)))
    })

    const config = join(dest, "nuxt.config.ts")
    if (locale !== "pt-PT") {
        const text = readFileSync(config, "utf8")
            .replace(/defaultLocale: "pt-PT"/, `defaultLocale: "${locale}"`)
            .replace(/fallbackLocale: "pt-PT"/, `fallbackLocale: "${locale}"`)
        writeFileSync(config, text)
    }

    const { env, setupCode: code } = fillEnv(readFileSync(join(dest, ".env.example"), "utf8"), { name, title })
    writeFileSync(join(dest, ".env"), env)

    return { dest, name, title, locale, setupCode: code }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
    try {
        const result = createProject(parseArgs(process.argv.slice(2)))
        console.log(`Created ${result.title} in ${relative(process.cwd(), result.dest) || "."}`)
        console.log(`Setup code for /setup: ${result.setupCode}`)
    }
    catch (error) {
        console.error(error.message)
        process.exit(1)
    }
}
