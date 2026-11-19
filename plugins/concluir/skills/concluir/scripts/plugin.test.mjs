// node --test plugins/concluir/skills/concluir/scripts/plugin.test.mjs
import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import { join, resolve } from "node:path"
import { test } from "node:test"

const pluginRoot = resolve(import.meta.dirname, "../../..")
const repoRoot = resolve(pluginRoot, "../..")
const skillDir = join(pluginRoot, "skills", "concluir")
const skill = () => readFileSync(join(skillDir, "SKILL.md"), "utf8").replace(/\r\n/g, "\n")

test("marketplace lists concluir", () => {
    const marketplace = JSON.parse(readFileSync(join(repoRoot, ".claude-plugin", "marketplace.json"), "utf8"))
    const entry = marketplace.plugins.find((plugin) => plugin.name === "concluir")
    assert.ok(entry, "concluir entry missing")
    assert.equal(entry.source, "./plugins/concluir")
})

test("plugin manifest and license", () => {
    const manifest = JSON.parse(readFileSync(join(pluginRoot, ".claude-plugin", "plugin.json"), "utf8"))
    assert.equal(manifest.name, "concluir")
    assert.match(manifest.version, /^\d+\.\d+\.\d+$/)
    assert.equal(manifest.license, "MIT")
    assert.ok(existsSync(join(pluginRoot, "LICENSE")))
})

test("skill frontmatter and cited files exist", () => {
    const text = skill()
    assert.match(text, /^---\nname: concluir\ndescription: Use /)
    const cited = [...text.matchAll(/(references\/[\w-]+\.md)/g)].map((match) => match[1])
    assert.ok(cited.length >= 2)
    for (const path of new Set(cited)) assert.ok(existsSync(join(skillDir, path)), path)
})

test("safety rules are kept", () => {
    const text = skill()
    for (const command of ["stash", "reset", "checkout", "clean"]) assert.ok(text.includes(`\`${command}\``), command)
    assert.match(text, /never `--force`/i)
    assert.match(text, /secrets/i)
    assert.match(text, /merge of the PR is the user's/i)
    assert.match(text, /background/i)
    assert.match(text, /never poll/i)
    assert.match(text, /`git branch -d`/)
    assert.match(text, /never `git add -A`/)
})

test("project specifics come from the project, not the skill", () => {
    const text = skill() + readFileSync(join(skillDir, "references", "settings.md"), "utf8")
    for (const word of ["Vendus", "MariaDB", "artisan", "Blade", "Reservations", "AdGuard", "D:/Repositories", "Ownership"]) assert.ok(!text.includes(word), word)
    for (const setting of ["git.integrationBranch", "git.baseBranch", "checks.full", "git.deleteMergedBranches"]) assert.ok(text.includes(setting), setting)
    assert.match(text, /CLAUDE\.md/)
})
