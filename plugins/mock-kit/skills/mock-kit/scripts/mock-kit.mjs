#!/usr/bin/env node
// mock-kit: interactive, no-build mocks (Vue 3 + Tailwind by CDN) with a growing component library.
//
//   node mock-kit.mjs init [--dir docs/mocks] [--lang pt-PT] [--from-css f | --from-tokens f] [--update-shell]
//   node mock-kit.mjs theme --from-css f | --from-tokens f
//   node mock-kit.mjs new <slug> --title "..." [--variants A,B] [--options "A:X,Y;B:Y,Z"] [--decisions "first|second"]
//   node mock-kit.mjs component <Name> --desc "..."
//   node mock-kit.mjs index | check
//   node mock-kit.mjs used <slug>
//   node mock-kit.mjs status <slug> proposta|aprovada|implementada
//   node mock-kit.mjs choice <slug> [--variant B --options "Y,Z"]   (no flags: print the choice)
//   node mock-kit.mjs serve [--port 8765]
//   node mock-kit.mjs shots <slug> [--variants A] [--options "X,Y"] [--browser path]
//
// Runs in the repo of the current folder; --dir is relative to the repo root.
import { execFileSync } from "node:child_process"
import { resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { addComponent, buildIndex, checkKit, getChoice, init, newMock, parseOptions, renderIndex, setChoice, setStatus, used, writeTheme } from "./kit.mjs"
import { launchEntry, startServer } from "./serve.mjs"
import { findBrowser, takeShots } from "./shots.mjs"

const USAGE = "Usage: mock-kit.mjs init | theme | new <slug> --title \"...\" | component <Name> --desc \"...\" | index | check | used <slug> | status <slug> <status> | choice <slug> [--variant B --options \"Y,Z\"] | serve | shots <slug>"
const FLAGS = new Set(["update-shell"])

export function parseArgs(argv) {
    const positional = []
    const options = {}
    for (let at = 0; at < argv.length; at += 1) {
        const arg = argv[at]
        if (!arg.startsWith("--")) {
            positional.push(arg)
            continue
        }
        const key = arg.slice(2)
        if (FLAGS.has(key)) options[key] = true
        else if (at + 1 >= argv.length || argv[at + 1].startsWith("--")) throw new Error(`--${key} needs a value\n${USAGE}`)
        else options[key] = argv[++at]
    }
    return { positional, options }
}

function projectRoot() {
    try {
        return execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim()
    } catch {
        return process.cwd()
    }
}

function report({ problems = [], warnings = [] }) {
    for (const line of problems) console.log(`problem: ${line}`)
    for (const line of warnings) console.log(`warning: ${line}`)
}

async function main(argv) {
    const { positional, options } = parseArgs(argv)
    const [command, first, second] = positional
    const root = projectRoot()
    const dir = options.dir ?? "docs/mocks"
    const ctx = { root, dir }
    switch (command) {
        case "init": {
            const result = init({ ...ctx, lang: options.lang, fromCss: options["from-css"], fromTokens: options["from-tokens"], updateShell: options["update-shell"] })
            console.log(`Kit in ${resolve(root, dir)}: ${result.created.length} files created, ${result.kept.length} kept, ${result.removed.length} removed, theme ${result.theme}`)
            return 0
        }
        case "theme": {
            if (!options["from-css"] && !options["from-tokens"]) throw new Error(`theme needs --from-css or --from-tokens\n${USAGE}`)
            const source = writeTheme({ ...ctx, fromCss: options["from-css"], fromTokens: options["from-tokens"] })
            const result = buildIndex(ctx)
            console.log(`Theme from ${source}; ${result.written.length} files updated`)
            report(result)
            return 0
        }
        case "new": {
            if (!options.title) throw new Error(`new needs --title\n${USAGE}`)
            const variants = (options.variants ?? "A").split(",").map((item) => item.trim()).filter(Boolean)
            const decisions = options.decisions ? options.decisions.split("|").map((item) => item.trim()).filter(Boolean) : []
            const { file } = newMock({ ...ctx, slug: first, title: options.title, variants, options: parseOptions(options.options, variants), decisions })
            console.log(`Created ${file}`)
            return 0
        }
        case "component": {
            const { file } = addComponent({ ...ctx, name: first, description: options.desc ?? "" })
            console.log(`Created ${file}`)
            return 0
        }
        case "index": {
            const result = buildIndex(ctx)
            console.log(`${result.written.length} files updated`)
            report(result)
            return result.problems.length ? 1 : 0
        }
        case "check": {
            const result = checkKit(ctx)
            report(result)
            console.log(result.ok ? "Mocks are consistent" : "Run: node mock-kit.mjs index, then fix the problems above")
            return result.ok ? 0 : 1
        }
        case "used": {
            const names = used({ ...ctx, slug: first })
            console.log(names.length ? names.join("\n") : "none")
            return 0
        }
        case "status": {
            const mock = setStatus({ ...ctx, slug: first, status: second })
            console.log(`${mock.file}: ${mock.status}`)
            return 0
        }
        case "choice": {
            const list = (value) => value.split(",").map((item) => item.trim()).filter(Boolean)
            const choice = options.variant
                ? setChoice({ ...ctx, slug: first, variant: options.variant, options: list(options.options ?? ""), source: "chat" })
                : getChoice({ ...ctx, slug: first })
            console.log(JSON.stringify(choice))
            return 0
        }
        case "serve": {
            const port = Number(options.port ?? 8765)
            const saveChoice = ({ file, variant, options: chosen }) => {
                if (typeof file !== "string" || !/^[a-z0-9][a-z0-9-]*\.html$/.test(file)) throw new Error("Invalid file")
                if (!Array.isArray(chosen) || !chosen.every((item) => typeof item === "string")) throw new Error("Invalid options")
                return setChoice({ ...ctx, slug: file.replace(/\.html$/, ""), variant, options: chosen })
            }
            const { url } = await startServer({ root: resolve(root, dir), port, renderIndex: () => renderIndex(ctx), saveChoice })
            console.log(`Serving ${resolve(root, dir)} at ${url}`)
            console.log("For .claude/launch.json:")
            console.log(JSON.stringify(launchEntry({ script: fileURLToPath(import.meta.url), dir, port }), null, 4))
            return null
        }
        case "shots": {
            const list = (value) => value.split(",").map((item) => item.trim()).filter(Boolean)
            const files = await takeShots({
                ...ctx,
                slug: first,
                browser: options.browser ?? findBrowser(),
                variants: options.variants ? list(options.variants) : null,
                options: options.options === undefined ? null : list(options.options),
            })
            for (const file of files) console.log(file)
            buildIndex(ctx)
            return 0
        }
        default:
            console.error(USAGE)
            return 2
    }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    main(process.argv.slice(2)).then((code) => {
        if (code !== null) process.exitCode = code
    }, (error) => {
        console.error(error.message)
        process.exitCode = 1
    })
}
