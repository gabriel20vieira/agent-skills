// node --test plugins/dev-crew/skills/dev-crew/scripts/plugin.test.mjs
import assert from "node:assert/strict"
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"

const here = dirname(fileURLToPath(import.meta.url))
const pluginRoot = resolve(here, "../../..")
const repoRoot = resolve(pluginRoot, "../..")

function readJson(path) {
    return JSON.parse(readFileSync(path, "utf8"))
}

/** Reads the `key: value` lines between the leading `---` markers. */
export function frontmatter(path) {
    const text = readFileSync(path, "utf8").replace(/\r\n/g, "\n")
    const match = text.match(/^---\n([\s\S]*?)\n---\n/)
    assert.ok(match, `${path} has no frontmatter`)
    const fields = {}
    for (const line of match[1].split("\n")) {
        const at = line.indexOf(":")
        if (at > 0) fields[line.slice(0, at).trim()] = line.slice(at + 1).trim()
    }
    return fields
}

function list(value) {
    return value.split(",").map((item) => item.trim()).filter(Boolean)
}

test("marketplace lists dev-crew", () => {
    const marketplace = readJson(join(repoRoot, ".claude-plugin", "marketplace.json"))
    const crew = marketplace.plugins.find((plugin) => plugin.name === "dev-crew")
    assert.ok(crew, "dev-crew entry missing")
    assert.equal(crew.source, "./plugins/dev-crew")
    const web = marketplace.plugins.find((plugin) => plugin.name === "web-foundation")
    assert.equal(web.source, "./")
})

test("plugin manifest", () => {
    const manifest = readJson(join(pluginRoot, ".claude-plugin", "plugin.json"))
    assert.equal(manifest.name, "dev-crew")
    assert.equal(manifest.version, "0.2.0")
    assert.ok(manifest.author?.name)
})

test("agents pin model and effort", () => {
    const expected = { coordinator: ["opus", "high"], developer: ["sonnet", "medium"], checker: ["haiku", "low"], scribe: ["opus", "medium"] }
    for (const [name, [model, effort]] of Object.entries(expected)) {
        const fields = frontmatter(join(pluginRoot, "agents", `${name}.md`))
        assert.equal(fields.name, name)
        assert.equal(fields.model, model, `${name} model`)
        assert.equal(fields.effort, effort, `${name} effort`)
        assert.match(fields.description, /^Use/, `${name} description`)
    }
})

test("checker tool list has no edit tools", () => {
    const fields = frontmatter(join(pluginRoot, "agents", "checker.md"))
    assert.deepEqual(list(fields.tools), ["Read", "Grep", "Glob", "Bash"])
})

test("coordinator does not write code", () => {
    const fields = frontmatter(join(pluginRoot, "agents", "coordinator.md"))
    const denied = list(fields.disallowedTools)
    for (const tool of ["Edit", "Write", "NotebookEdit"]) assert.ok(denied.includes(tool), tool)
})

const skillDir = join(pluginRoot, "skills", "dev-crew")

test("skill frontmatter", () => {
    const fields = frontmatter(join(skillDir, "SKILL.md"))
    assert.equal(fields.name, "dev-crew")
    assert.match(fields.description, /^Use when/)
})

test("skill references exist", () => {
    const text = readFileSync(join(skillDir, "SKILL.md"), "utf8")
    const cited = [...text.matchAll(/(references\/[\w-]+\.md|scripts\/[\w-]+\.mjs)/g)].map((match) => match[1])
    assert.ok(cited.length >= 3, "SKILL.md should cite its references and scripts")
    for (const path of new Set(cited)) assert.ok(existsSync(join(skillDir, path)), path)
})

test("skill names every agent", () => {
    const text = readFileSync(join(skillDir, "SKILL.md"), "utf8")
    for (const agent of ["dev-crew:coordinator", "dev-crew:developer", "dev-crew:checker", "dev-crew:scribe"]) assert.ok(text.includes(agent), agent)
})

test("scribe writes docs but launches nobody", () => {
    const fields = frontmatter(join(pluginRoot, "agents", "scribe.md"))
    const tools = list(fields.tools)
    for (const tool of ["Read", "Write", "Edit", "Bash"]) assert.ok(tools.includes(tool), tool)
    assert.ok(!tools.includes("Agent"))
})

test("skill reads docs and picks skills before planning", () => {
    const text = readFileSync(join(skillDir, "SKILL.md"), "utf8")
    assert.ok(text.includes("references/docs.md"))
    assert.ok(text.indexOf("**Context.**") < text.indexOf("**Plan.**"), "Context step comes before Plan")
})

test("the crew has no dashboard", () => {
    assert.ok(!existsSync(join(pluginRoot, "dashboard")), "dashboard folder")
    assert.ok(!existsSync(join(skillDir, "references", "dashboard.md")), "dashboard reference")
    const files = []
    const walk = (dir) => {
        for (const entry of readdirSync(dir)) {
            const path = join(dir, entry)
            if (statSync(path).isDirectory()) walk(path)
            else if (path.endsWith(".md") || path.endsWith(".json")) files.push(path)
        }
    }
    walk(pluginRoot)
    for (const path of files) {
        const text = readFileSync(path, "utf8")
        assert.ok(!/ArtifactData|dashboard/i.test(text), `${path} still mentions the dashboard`)
    }
})

test("launchers pass a quota instead of reading shared limits", () => {
    const text = readFileSync(join(skillDir, "references", "brief.md"), "utf8")
    assert.match(text, /Quota: up to/)
})
