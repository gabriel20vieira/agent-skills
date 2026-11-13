// node --test plugins/mock-kit/skills/mock-kit/scripts/plugin.test.mjs
import assert from "node:assert/strict"
import { existsSync, readdirSync, readFileSync } from "node:fs"
import { join, resolve } from "node:path"
import { test } from "node:test"

const pluginRoot = resolve(import.meta.dirname, "../../..")
const repoRoot = resolve(pluginRoot, "../..")
const skillDir = join(pluginRoot, "skills", "mock-kit")

test("marketplace lists mock-kit", () => {
    const marketplace = JSON.parse(readFileSync(join(repoRoot, ".claude-plugin", "marketplace.json"), "utf8"))
    const entry = marketplace.plugins.find((plugin) => plugin.name === "mock-kit")
    assert.ok(entry, "mock-kit entry missing")
    assert.equal(entry.source, "./plugins/mock-kit")
})

test("plugin manifest", () => {
    const manifest = JSON.parse(readFileSync(join(pluginRoot, ".claude-plugin", "plugin.json"), "utf8"))
    assert.equal(manifest.name, "mock-kit")
    assert.equal(manifest.version, "0.1.0")
    assert.ok(manifest.author?.name)
})

test("skill frontmatter and every cited file exists", () => {
    const text = readFileSync(join(skillDir, "SKILL.md"), "utf8").replace(/\r\n/g, "\n")
    assert.match(text, /^---\nname: mock-kit\ndescription: Use /)
    const cited = [...text.matchAll(/(references\/[\w-]+\.md|scripts\/[\w-]+\.mjs)/g)].map((match) => match[1])
    for (const path of new Set(cited)) assert.ok(existsSync(join(skillDir, path)), path)
    for (const reference of ["components.md", "mock-checklist.md", "variants.md", "theme.md"]) assert.ok(text.includes(`references/${reference}`), reference)
})

test("the skill keeps mocks interactive, white and shown with screenshots", () => {
    const text = readFileSync(join(skillDir, "SKILL.md"), "utf8")
    assert.match(text, /always white/i)
    assert.match(text, /shots <slug>/)
    assert.match(text, /clickable/)
    assert.match(text, /alert\(\)/)
    assert.match(text, /desktop, tablet and mobile/)
    assert.match(text, /--options/)
    assert.doesNotMatch(text, /mock-rules/)
})

test("versions are pinned to exact versions in one file", () => {
    const versions = JSON.parse(readFileSync(join(skillDir, "assets", "kit", "versions.json"), "utf8"))
    assert.deepEqual(Object.keys(versions).sort(), ["lucide", "tailwind", "vue"])
    for (const url of Object.values(versions)) assert.match(url, /^https:\/\/cdn\.jsdelivr\.net\/npm\/[@\w/.-]+@\d+\.\d+\.\d+\//)
    const shell = readdirSync(join(skillDir, "assets", "kit", "shell")).join(" ")
    for (const file of ["kit.js"].map((name) => join(skillDir, "assets", "kit", name)).concat(readdirSync(join(skillDir, "assets", "kit", "shell")).map((name) => join(skillDir, "assets", "kit", "shell", name)))) {
        assert.doesNotMatch(readFileSync(file, "utf8"), /cdn\.jsdelivr|unpkg\.com/, `${file} must not hard-code a CDN URL`)
    }
    for (const name of ["MockBar", "MockFrame", "MockOption", "MockVariant", "MockToast", "MockModal", "MockState", "MockStepper", "MockIcon"]) assert.ok(shell.includes(`${name}.js`), name)
})
