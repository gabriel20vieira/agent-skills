// The mock kit inside a project: init, new mocks, components, the index and its checks.
// Every function takes { root, dir }: the project root and the mocks folder relative to it.
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs"
import { dirname, join, relative, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { DEFAULT_TOKENS, renderThemeCss, themeBlock, tokensFromCss, tokensFromJson } from "./theme.mjs"

const here = dirname(fileURLToPath(import.meta.url))
export const ASSETS = resolve(here, "../assets/kit")
export const TEMPLATES = resolve(here, "../templates")
export const HEAD_START = "<!-- mock-kit:head:start -->"
export const HEAD_END = "<!-- mock-kit:head:end -->"
export const STATUSES = ["proposta", "aprovada", "implementada"]
const SLUG = /^[a-z0-9][a-z0-9-]*$/
const COMPONENT = /^[A-Z][A-Za-z0-9]*$/
const INTERACTION = /(@click|@submit|@input|@change|@keydown|@keyup|v-on:|v-model)/

const TEXT = {
    "pt-PT": {
        variant: "Variante",
        placeholder: "Substitua este conteúdo pela mock: dados realistas e tudo clicável.",
        tryIt: "Experimentar",
        clicked: "Clique",
        title: "Mocks",
        mocks: "Mocks",
        components: "Componentes",
        none: "Ainda não há mocks.",
        noComponents: "Ainda não há componentes do projeto.",
        decisions: "decisões",
        usedBy: "Usado em",
        unused: "sem uso",
        status: { proposta: "proposta", aprovada: "aprovada", implementada: "implementada" },
    },
    "en-US": {
        variant: "Variant",
        placeholder: "Replace this with the mock: realistic data, everything clickable.",
        tryIt: "Try it",
        clicked: "Click",
        title: "Mocks",
        mocks: "Mocks",
        components: "Components",
        none: "No mocks yet.",
        noComponents: "No project components yet.",
        decisions: "decisions",
        usedBy: "Used in",
        unused: "unused",
        status: { proposta: "proposal", aprovada: "approved", implementada: "implemented" },
    },
}

const paths = (root, dir) => {
    const base = join(root, dir)
    return {
        base,
        kit: join(base, "_kit"),
        mocks: join(base, "mocks.json"),
        components: join(base, "_kit", "components.json"),
        versions: join(base, "_kit", "versions.json"),
        theme: join(base, "_kit", "theme.css"),
        index: join(base, "index.html"),
        shots: join(base, "_shots"),
    }
}

const readJson = (path, fallback) => (existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : fallback)
const writeJson = (path, value) => writeFileSync(path, JSON.stringify(value, null, 4) + "\n")
const kebab = (name) => name.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase()
const escapeHtml = (text) => String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
const scriptJson = (value) => JSON.stringify(value).replace(/</g, "\\u003c")

function listFiles(dir) {
    const out = []
    if (!existsSync(dir)) return out
    for (const entry of readdirSync(dir)) {
        const path = join(dir, entry)
        if (statSync(path).isDirectory()) out.push(...listFiles(path))
        else out.push(path)
    }
    return out
}

function texts(lang) {
    return TEXT[lang] ?? TEXT["pt-PT"]
}

function loadTokens(root, { fromCss, fromTokens }) {
    if (fromCss) return { tokens: tokensFromCss(readFileSync(resolve(root, fromCss), "utf8")), source: fromCss }
    if (fromTokens) return { tokens: tokensFromJson(JSON.parse(readFileSync(resolve(root, fromTokens), "utf8"))), source: fromTokens }
    return null
}

/** Writes _kit/theme.css from a project's CSS or tokens file, filling gaps with the defaults. */
export function writeTheme({ root, dir, fromCss, fromTokens }) {
    const p = paths(root, dir)
    const loaded = loadTokens(root, { fromCss, fromTokens })
    const tokens = { ...DEFAULT_TOKENS, ...(loaded?.tokens ?? {}) }
    writeFileSync(p.theme, renderThemeCss(tokens, loaded?.source))
    return loaded?.source ?? "default"
}

/** Creates the kit. Never overwrites project components, registries or theme.css (unless --from-*). */
export function init({ root, dir, lang = "pt-PT", fromCss, fromTokens, updateShell = false }) {
    const p = paths(root, dir)
    const created = []
    const kept = []
    mkdirSync(join(p.kit, "components"), { recursive: true })
    for (const source of listFiles(ASSETS)) {
        const rel = relative(ASSETS, source)
        const target = join(p.kit, rel)
        const isShell = rel.startsWith("shell")
        if (existsSync(target) && !(isShell && updateShell)) {
            kept.push(rel)
            continue
        }
        mkdirSync(dirname(target), { recursive: true })
        cpSync(source, target)
        created.push(rel)
    }
    if (!existsSync(p.components)) writeJson(p.components, [])
    if (!existsSync(p.mocks)) writeJson(p.mocks, { lang, mocks: [] })
    let theme = "kept"
    if (fromCss || fromTokens || !existsSync(p.theme)) theme = writeTheme({ root, dir, fromCss, fromTokens })
    buildIndex({ root, dir })
    return { created, kept, theme }
}

/** The generated <head> block: importmap, Tailwind, Lucide, theme.css and the @theme mapping. */
export function headBlock({ root, dir }) {
    const p = paths(root, dir)
    const versions = readJson(p.versions, readJson(join(ASSETS, "versions.json")))
    const tokens = existsSync(p.theme) ? tokensFromCss(readFileSync(p.theme, "utf8")) : DEFAULT_TOKENS
    return [
        HEAD_START,
        `<script type="importmap">${JSON.stringify({ imports: { vue: versions.vue } })}</script>`,
        `<script src="${versions.tailwind}"></script>`,
        `<script src="${versions.lucide}"></script>`,
        `<link rel="stylesheet" href="./_kit/theme.css">`,
        `<style type="text/tailwindcss">\n${themeBlock(tokens)}\n</style>`,
        HEAD_END,
    ].join("\n")
}

function withHead(html, head) {
    const start = html.indexOf(HEAD_START)
    const end = html.indexOf(HEAD_END)
    if (start >= 0 && end > start) return html.slice(0, start) + head + html.slice(end + HEAD_END.length)
    return html.replace(/<\/head>/i, `${head}\n</head>`)
}

/** Creates <slug>.html from the template and registers it in mocks.json. */
export function newMock({ root, dir, slug, title, variants = ["A"], decisions = [], date = new Date().toISOString().slice(0, 10) }) {
    if (!SLUG.test(slug ?? "")) throw new Error(`Invalid slug "${slug}": use lowercase letters, digits and dashes`)
    const p = paths(root, dir)
    const registry = readJson(p.mocks, { lang: "pt-PT", mocks: [] })
    const file = `${slug}.html`
    if (existsSync(join(p.base, file)) || registry.mocks.some((mock) => mock.file === file)) throw new Error(`Mock ${file} already exists`)
    const t = texts(registry.lang)
    const blocks = variants.map((name) => [
        `            <mock-variant name="${escapeHtml(name)}">`,
        "                <section class=\"flex flex-col gap-4 p-6\">",
        `                    <h1 class="text-xl font-semibold">${escapeHtml(title)} · ${t.variant} ${escapeHtml(name)}</h1>`,
        `                    <p class="text-muted-foreground">${t.placeholder}</p>`,
        `                    <button type="button" class="w-fit rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground" @click="state.clicks++; toast('${t.clicked} ' + state.clicks)">${t.tryIt}</button>`,
        "                </section>",
        "            </mock-variant>",
    ].join("\n"))
    const html = readFileSync(join(TEMPLATES, "mock.html"), "utf8")
        .replace("__HEAD__", () => headBlock({ root, dir }))
        .replaceAll("__LANG__", registry.lang)
        .replaceAll("__TITLE__", escapeHtml(title))
        .replace("__VARIANTS__", () => blocks.join("\n"))
        .replace("__VARIANT_LIST__", () => scriptJson(variants))
        .replace("__RULES__", () => scriptJson(decisions))
    writeFileSync(join(p.base, file), html)
    registry.mocks.push({ file, title, date, status: "proposta", decisions, variants })
    writeJson(p.mocks, registry)
    buildIndex({ root, dir })
    return { file: join(p.base, file) }
}

/** Creates _kit/components/<Name>.js from the template and registers it in components.json. */
export function addComponent({ root, dir, name, description = "" }) {
    if (!COMPONENT.test(name ?? "")) throw new Error(`Invalid component name "${name}": use PascalCase, letters and digits`)
    if (name.startsWith("Mock")) throw new Error(`"${name}" is reserved: names starting with Mock belong to the shell`)
    const p = paths(root, dir)
    const registry = readJson(p.components, [])
    const file = `components/${name}.js`
    const target = join(p.kit, "components", `${name}.js`)
    if (existsSync(target) || registry.some((entry) => entry.name.toLowerCase() === name.toLowerCase())) throw new Error(`Component ${name} already exists`)
    mkdirSync(dirname(target), { recursive: true })
    writeFileSync(target, readFileSync(join(TEMPLATES, "component.js"), "utf8").replaceAll("__NAME__", name).replaceAll("__DESC__", description))
    registry.push({ name, file, description, props: ["title: String"], emits: ["select"], slots: ["default"], example: `<${kebab(name)}></${kebab(name)}>`, usedBy: [] })
    writeJson(p.components, registry)
    return { file: target }
}

/** Names of the given components that a mock uses: tags (PascalCase or kebab-case) or imports. */
export function usedComponents(html, names) {
    return names.filter((name) => {
        const tag = new RegExp(`<(${name}|${kebab(name)})[\\s>/]`)
        return tag.test(html) || html.includes(`/components/${name}.js`)
    }).sort()
}

function renderIndexHtml({ registry, components, shotsDir }) {
    const t = texts(registry.lang)
    const mockRows = registry.mocks.map((mock) => {
        const slug = mock.file.replace(/\.html$/, "")
        const shot = `_shots/${slug}-${(mock.variants ?? ["A"])[0]}-desktop.png`
        const thumb = existsSync(join(shotsDir, `${slug}-${(mock.variants ?? ["A"])[0]}-desktop.png`)) ? `<img src="${escapeHtml(shot)}" alt="">` : ""
        return `<li><a class="card" href="${escapeHtml(mock.file)}">${thumb}<strong>${escapeHtml(mock.title)}</strong>`
            + `<span class="meta">${escapeHtml(mock.date ?? "")} · <span class="status ${escapeHtml(mock.status)}">${escapeHtml(t.status[mock.status] ?? mock.status)}</span>`
            + ` · ${(mock.decisions ?? []).length} ${t.decisions} · ${(mock.variants ?? []).map(escapeHtml).join(" / ")}</span></a></li>`
    })
    const componentRows = components.map((entry) => `<tr><td><code>${escapeHtml(entry.name)}</code>${entry.unused ? ` <span class="status">${t.unused}</span>` : ""}</td>`
        + `<td>${escapeHtml(entry.description ?? "")}</td><td>${(entry.usedBy ?? []).map((file) => `<a href="${escapeHtml(file.startsWith("components/") ? `_kit/${file}` : file)}">${escapeHtml(file)}</a>`).join(", ")}</td></tr>`)
    return `<!doctype html>
<html lang="${escapeHtml(registry.lang)}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${t.title}</title>
<!-- Generated by mock-kit (mock-kit.mjs index); do not edit by hand. -->
<style>
body { margin: 0; background: #fff; color: #0f172a; font: 15px/1.5 ui-sans-serif, system-ui, sans-serif; color-scheme: light; }
main { max-width: 1100px; margin: 0 auto; padding: 32px 16px; }
h1 { margin: 0 0 24px; font-size: 24px; } h2 { margin: 32px 0 12px; font-size: 16px; text-transform: uppercase; letter-spacing: .05em; color: #64748b; }
ul { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 16px; }
.card { display: flex; flex-direction: column; gap: 6px; padding: 12px; border: 1px solid #e2e8f0; border-radius: 12px; color: inherit; text-decoration: none; }
.card:hover { border-color: #94a3b8; } .card img { width: 100%; border-radius: 8px; border: 1px solid #e2e8f0; }
.meta { color: #64748b; font-size: 13px; } .status { padding: 1px 6px; border-radius: 999px; background: #f1f5f9; font-size: 12px; }
.status.aprovada { background: #dcfce7; } .status.implementada { background: #dbeafe; }
table { width: 100%; border-collapse: collapse; font-size: 14px; } td { padding: 8px; border-top: 1px solid #e2e8f0; vertical-align: top; }
</style>
</head>
<body>
<main>
<h1>${t.title}</h1>
<h2>${t.mocks}</h2>
${mockRows.length ? `<ul>\n${mockRows.join("\n")}\n</ul>` : `<p class="meta">${t.none}</p>`}
<h2>${t.components}</h2>
${componentRows.length ? `<table>\n${componentRows.join("\n")}\n</table>` : `<p class="meta">${t.noComponents}</p>`}
</main>
</body>
</html>
`
}

/** What index would write, and what is wrong. Writes nothing. */
function analyse({ root, dir }) {
    const p = paths(root, dir)
    const problems = []
    const warnings = []
    const registry = readJson(p.mocks, { lang: "pt-PT", mocks: [] })
    const components = readJson(p.components, [])
    const head = headBlock({ root, dir })
    const writes = new Map()

    const seenMocks = new Set()
    for (const mock of registry.mocks) {
        if (seenMocks.has(mock.file)) problems.push(`duplicate mock: ${mock.file}`)
        seenMocks.add(mock.file)
        if (!STATUSES.includes(mock.status)) problems.push(`invalid status "${mock.status}" in ${mock.file}`)
    }
    const seenNames = new Set()
    for (const entry of components) {
        const key = entry.name.toLowerCase()
        if (seenNames.has(key)) problems.push(`duplicate component name: ${key}`)
        seenNames.add(key)
        if (!existsSync(join(p.kit, entry.file))) problems.push(`missing component file: ${entry.file}`)
    }
    const registeredComponents = new Set(components.map((entry) => entry.file))
    for (const file of listFiles(join(p.kit, "components"))) {
        const rel = `components/${relative(join(p.kit, "components"), file).replace(/\\/g, "/")}`
        if (rel.endsWith(".js") && !registeredComponents.has(rel)) warnings.push(`unregistered component file: ${rel}`)
    }
    const htmlFiles = existsSync(p.base) ? readdirSync(p.base).filter((file) => file.endsWith(".html") && file !== "index.html") : []
    for (const file of htmlFiles) if (!seenMocks.has(file)) warnings.push(`unregistered mock: ${file}`)

    const usedBy = new Map(components.map((entry) => [entry.name, []]))
    for (const mock of registry.mocks) {
        const path = join(p.base, mock.file)
        if (!existsSync(path)) {
            problems.push(`missing mock file: ${mock.file}`)
            continue
        }
        const html = readFileSync(path, "utf8")
        const body = html.slice(html.search(/<body/i))
        if (!INTERACTION.test(body)) problems.push(`no interaction in ${mock.file} (mocks must be interactive)`)
        const next = withHead(html, head)
        if (next !== html) writes.set(path, next)
        for (const name of usedComponents(html, components.map((entry) => entry.name))) usedBy.get(name).push(mock.file)
    }
    // A component used inside another component counts as used, through that component.
    for (const entry of components) {
        const source = join(p.kit, entry.file)
        if (!existsSync(source)) continue
        const others = components.map((other) => other.name).filter((name) => name !== entry.name)
        for (const name of usedComponents(readFileSync(source, "utf8"), others)) usedBy.get(name).push(entry.file)
    }
    const nextComponents = components.map((entry) => {
        const used = usedBy.get(entry.name) ?? []
        const { unused, ...rest } = entry
        return used.length ? { ...rest, usedBy: used } : { ...rest, usedBy: [], unused: true }
    })
    for (const entry of nextComponents) if (entry.unused) warnings.push(`unused component: ${entry.name}`)
    if (JSON.stringify(nextComponents) !== JSON.stringify(components)) writes.set(p.components, JSON.stringify(nextComponents, null, 4) + "\n")
    const indexHtml = renderIndexHtml({ registry, components: nextComponents, shotsDir: p.shots })
    if (!existsSync(p.index) || readFileSync(p.index, "utf8") !== indexHtml) writes.set(p.index, indexHtml)
    return { problems, warnings, writes, registry }
}

/** Regenerates index.html, every mock's head block and the components' usedBy. */
export function buildIndex({ root, dir }) {
    const { problems, warnings, writes } = analyse({ root, dir })
    for (const [path, text] of writes) writeFileSync(path, text)
    return { problems, warnings, written: [...writes.keys()] }
}

/** Like index, without writing. ok is false when there are problems or anything to regenerate. */
export function checkKit({ root, dir }) {
    const { problems, warnings, writes } = analyse({ root, dir })
    const all = [...problems]
    for (const path of writes.keys()) {
        const name = relative(join(root, dir), path).replace(/\\/g, "/")
        if (name.endsWith(".html") && name !== "index.html") all.push(`outdated head block in ${name} (run index)`)
        else all.push(`outdated ${name} (run index)`)
    }
    return { ok: all.length === 0, problems: all, warnings }
}

export function mockEntry({ root, dir, slug }) {
    const registry = readJson(paths(root, dir).mocks, { lang: "pt-PT", mocks: [] })
    const mock = registry.mocks.find((entry) => entry.file === `${slug}.html`)
    if (!mock) throw new Error(`Mock ${slug}.html not found in mocks.json`)
    return mock
}

/** Components a registered mock uses. */
export function used({ root, dir, slug }) {
    const p = paths(root, dir)
    const mock = mockEntry({ root, dir, slug })
    const names = readJson(p.components, []).map((entry) => entry.name)
    return usedComponents(readFileSync(join(p.base, mock.file), "utf8"), names)
}

export function setStatus({ root, dir, slug, status }) {
    if (!STATUSES.includes(status)) throw new Error(`Invalid status "${status}": use ${STATUSES.join(", ")}`)
    const p = paths(root, dir)
    const registry = readJson(p.mocks, { lang: "pt-PT", mocks: [] })
    const mock = registry.mocks.find((entry) => entry.file === `${slug}.html`)
    if (!mock) throw new Error(`Mock ${slug}.html not found in mocks.json`)
    mock.status = status
    writeJson(p.mocks, registry)
    buildIndex({ root, dir })
    return mock
}
