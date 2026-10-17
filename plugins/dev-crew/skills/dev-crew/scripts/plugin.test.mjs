// node --test plugins/dev-crew/skills/dev-crew/scripts/plugin.test.mjs
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
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
    assert.equal(manifest.version, "0.1.0")
    assert.ok(manifest.author?.name)
})

test("agents pin model and effort", () => {
    const expected = { coordinator: ["opus", "high"], developer: ["sonnet", "medium"], checker: ["haiku", "low"] }
    for (const [name, [model, effort]] of Object.entries(expected)) {
        const fields = frontmatter(join(pluginRoot, "agents", `${name}.md`))
        assert.equal(fields.name, name)
        assert.equal(fields.model, model, `${name} model`)
        assert.equal(fields.effort, effort, `${name} effort`)
        assert.match(fields.description, /^Use/, `${name} description`)
    }
})

test("checker cannot edit", () => {
    const fields = frontmatter(join(pluginRoot, "agents", "checker.md"))
    assert.deepEqual(list(fields.tools), ["Read", "Grep", "Glob", "Bash", "ToolSearch", "ArtifactData"])
})

test("coordinator does not write code", () => {
    const fields = frontmatter(join(pluginRoot, "agents", "coordinator.md"))
    const denied = list(fields.disallowedTools)
    for (const tool of ["Edit", "Write", "NotebookEdit"]) assert.ok(denied.includes(tool), tool)
})
