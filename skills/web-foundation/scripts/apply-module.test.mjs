// node --test skills/web-foundation/scripts/apply-module.test.mjs
import assert from "node:assert/strict"
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { after, test } from "node:test"
import { applyModule, mergeMissing, recordModule } from "./apply-module.mjs"

const root = mkdtempSync(join(tmpdir(), "apply-module-"))
after(() => rmSync(root, { recursive: true, force: true }))

function write(path, content) {
    mkdirSync(dirname(path), { recursive: true })
    writeFileSync(path, typeof content === "string" ? content : JSON.stringify(content))
}

test("mergeMissing adds new keys and reports conflicting ones", () => {
    const target = { a: { b: "keep" }, c: "same" }
    const skipped = mergeMissing(target, { a: { b: "other", d: "new" }, c: "same", e: { f: "x" } })
    assert.deepEqual(target, { a: { b: "keep", d: "new" }, c: "same", e: { f: "x" } })
    assert.deepEqual(skipped, ["a.b"])
})

test("applyModule copies new files, keeps existing ones and merges i18n", () => {
    const modules = join(root, "modules")
    write(join(modules, "demo", "files", "server", "api", "demo.get.ts"), "export default 1\n")
    write(join(modules, "demo", "files", "app", "pages", "index.vue"), "<template />\n")
    write(join(modules, "demo", "i18n", "pt-PT.json"), { demo: { title: "Demo" }, common: { save: "Outro" } })

    const project = join(root, "project")
    write(join(project, "package.json"), { name: "p" })
    write(join(project, "app", "pages", "index.vue"), "original\n")
    write(join(project, "i18n", "locales", "pt-PT.json"), { common: { save: "Guardar" } })

    const result = applyModule("demo", project, { modulesDir: modules })
    assert.deepEqual(result.copied, [join("server", "api", "demo.get.ts")])
    assert.deepEqual(result.existing, [join("app", "pages", "index.vue")])
    assert.equal(readFileSync(join(project, "app", "pages", "index.vue"), "utf8"), "original\n")
    const locale = JSON.parse(readFileSync(join(project, "i18n", "locales", "pt-PT.json"), "utf8"))
    assert.deepEqual(locale, { common: { save: "Guardar" }, demo: { title: "Demo" } })
    assert.equal(result.i18nSkipped.length, 1)
})

test("applyModule rejects unknown modules and non-project folders", () => {
    assert.throws(() => applyModule("nope", root, { modulesDir: join(root, "modules") }), /Unknown module/)
    assert.throws(() => applyModule("demo", join(root, "modules"), { modulesDir: join(root, "modules") }), /Not a project/)
})

test("recordModule adds the module to modules.installed in docs/settings.md", () => {
    const table = [
        "| Setting | Value | Options | What it decides |",
        "| --- | --- | --- | --- |",
        "| `git.baseBranch` | `main` | branch name | Base. |",
        "| `modules.installed` | `none` | module names | Modules applied. |",
        "",
    ].join("\n")
    assert.equal(
        recordModule(table, "pwa"),
        table.replace("| `modules.installed` | `none` |", "| `modules.installed` | `pwa` |"),
    )
    const once = recordModule(table, "pwa")
    assert.equal(recordModule(once, "pwa"), once)
    assert.match(recordModule(once, "assistant"), /\| `modules\.installed` \| `assistant`, `pwa` \|/)
    assert.equal(recordModule("no table here\n", "pwa"), null)
})

test("applyModule updates docs/settings.md when the project has one", () => {
    const modules = join(root, "modules-rec")
    write(join(modules, "demo", "files", "x.txt"), "x\n")
    const project = join(root, "project-rec")
    write(join(project, "package.json"), { name: "p" })
    write(join(project, "docs", "settings.md"), "| `modules.installed` | | module names | Modules applied. |\n")
    const result = applyModule("demo", project, { modulesDir: modules })
    assert.equal(result.settings, "docs/settings.md")
    assert.equal(readFileSync(join(project, "docs", "settings.md"), "utf8"), "| `modules.installed` | `demo` | module names | Modules applied. |\n")
    const bare = join(root, "project-bare")
    write(join(bare, "package.json"), { name: "p" })
    assert.equal(applyModule("demo", bare, { modulesDir: modules }).settings, null)
})
