// node --test plugins/docs-keeper/skills/docs-keeper/scripts/plugin.test.mjs
import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import { join, resolve } from "node:path"
import { test } from "node:test"

const pluginRoot = resolve(import.meta.dirname, "../../..")
const repoRoot = resolve(pluginRoot, "../..")
const skillDir = join(pluginRoot, "skills", "docs-keeper")

test("marketplace lists docs-keeper", () => {
    const marketplace = JSON.parse(readFileSync(join(repoRoot, ".claude-plugin", "marketplace.json"), "utf8"))
    const entry = marketplace.plugins.find((plugin) => plugin.name === "docs-keeper")
    assert.ok(entry, "docs-keeper entry missing")
    assert.equal(entry.source, "./plugins/docs-keeper")
})

test("plugin manifest", () => {
    const manifest = JSON.parse(readFileSync(join(pluginRoot, ".claude-plugin", "plugin.json"), "utf8"))
    assert.equal(manifest.name, "docs-keeper")
    assert.equal(manifest.version, "0.1.0")
})

test("skill frontmatter and references", () => {
    const text = readFileSync(join(skillDir, "SKILL.md"), "utf8").replace(/\r\n/g, "\n")
    assert.match(text, /^---\nname: docs-keeper\ndescription: Use /)
    const cited = [...text.matchAll(/(references\/[\w-]+\.md|scripts\/[\w-]+\.mjs)/g)].map((match) => match[1])
    assert.ok(cited.length >= 3)
    for (const path of new Set(cited)) assert.ok(existsSync(join(skillDir, path)), path)
})

test("categories split architecture from ui and theming", () => {
    const text = readFileSync(join(skillDir, "references", "categories.md"), "utf8")
    for (const folder of ["architecture/", "ui/", "data/", "api/", "auth/", "operations/", "decisions/", "guides/"]) assert.ok(text.includes(`\`${folder}\``), folder)
    assert.match(text, /theming/i)
})
