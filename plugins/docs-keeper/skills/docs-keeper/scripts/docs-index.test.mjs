// node --test plugins/docs-keeper/skills/docs-keeper/scripts/docs-index.test.mjs
import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { after, test } from "node:test"
import { applyIndex, checkIndex, collectDocs, END, findStale, parseDoc, renderIndex, START, writeIndex } from "./docs-index.mjs"

const cli = join(import.meta.dirname, "docs-index.mjs")
const root = mkdtempSync(join(tmpdir(), "docs-index-"))
after(() => rmSync(root, { recursive: true, force: true }))

let count = 0

function project(files) {
    const dir = join(root, `case-${++count}`)
    for (const [path, content] of Object.entries(files)) {
        mkdirSync(dirname(join(dir, path)), { recursive: true })
        writeFileSync(join(dir, path), content)
    }
    mkdirSync(dir, { recursive: true })
    return dir
}

function doc(title, summary, extra = "") {
    return `# ${title}\n\n> ${summary}\n\nUpdated: 2026-10-01\nSources: src/\n\n${extra}Body.\n`
}

test("parseDoc reads title, summary, updated and sources", () => {
    const parsed = parseDoc(doc("UI and theming", "Components, layout and the theme system.").replace("Sources: src/", "Sources: app/components/, app/assets/css/themes"))
    assert.deepEqual(parsed, {
        title: "UI and theming",
        summary: "Components, layout and the theme system.",
        updated: "2026-10-01",
        sources: ["app/components/", "app/assets/css/themes"],
    })
})

test("parseDoc takes the summary only from a quote right after the title", () => {
    assert.equal(parseDoc("# Plan\n\nSome paragraph.\n\n> later quote\n").summary, "")
    assert.equal(parseDoc("# Plan\r\n\r\n> CRLF summary\r\n").summary, "CRLF summary")
    assert.equal(parseDoc("No title here\n").title, "")
})

test("collectDocs groups by first folder under docs, sorted, with posix paths", () => {
    const dir = project({
        "docs/ui/theming.md": doc("Theming", "Themes."),
        "docs/architecture/overview.md": doc("Overview", "The big picture."),
        "docs/settings.md": "# Project settings\n",
        "docs/superpowers/specs/a-design.md": "# A design\n",
        "docs/ui/notes.txt": "not markdown",
    })
    const docs = collectDocs(dir)
    assert.deepEqual(docs.map((entry) => [entry.category, entry.path]), [
        ["", "docs/settings.md"],
        ["architecture", "docs/architecture/overview.md"],
        ["superpowers", "docs/superpowers/specs/a-design.md"],
        ["ui", "docs/ui/theming.md"],
    ])
})

test("renderIndex lists every doc by category with its summary", () => {
    const dir = project({
        "docs/architecture/overview.md": doc("Overview", "The big picture."),
        "docs/settings.md": "# Project settings\n",
    })
    const block = renderIndex(collectDocs(dir))
    assert.ok(block.startsWith(START))
    assert.ok(block.endsWith(END))
    assert.match(block, /### docs\n- \[Project settings\]\(docs\/settings\.md\)\n/)
    assert.match(block, /### architecture\n- \[Overview\]\(docs\/architecture\/overview\.md\) - The big picture\.\n/)
})

test("applyIndex replaces the block, appends a Docs section, or creates CLAUDE.md", () => {
    const block = `${START}\nnew\n${END}`
    assert.equal(applyIndex(`# P\n\nRules.\n\n${START}\nold\n${END}\n\nAfter.\n`, block, "p"), `# P\n\nRules.\n\n${block}\n\nAfter.\n`)
    assert.equal(applyIndex("# P\n\nRules.\n", block, "p"), `# P\n\nRules.\n\n## Docs\n\n${block}\n`)
    assert.equal(applyIndex(null, block, "my-app"), `# my-app\n\n## Docs\n\n${block}\n`)
    assert.equal(applyIndex("# P\r\n\r\nRules.\r\n", block, "p"), `# P\r\n\r\nRules.\r\n\r\n## Docs\r\n\r\n${block.replace(/\n/g, "\r\n")}\r\n`)
})

test("writeIndex then checkIndex passes; a new doc makes check fail and name it", () => {
    const dir = project({ "docs/architecture/overview.md": doc("Overview", "The big picture."), "CLAUDE.md": "# P\n" })
    assert.equal(writeIndex(dir).changed, true)
    assert.equal(writeIndex(dir).changed, false)
    assert.deepEqual(checkIndex(dir), { ok: true, missing: [], extra: [] })
    writeFileSync(join(dir, "docs", "architecture", "data-flow.md"), doc("Data flow", "How data moves."))
    const result = checkIndex(dir)
    assert.equal(result.ok, false)
    assert.deepEqual(result.missing, ["docs/architecture/data-flow.md"])
})

test("checkIndex reports a doc that was removed but is still listed", () => {
    const dir = project({ "docs/a/one.md": doc("One", "1."), "docs/a/two.md": doc("Two", "2.") })
    writeIndex(dir)
    rmSync(join(dir, "docs", "a", "two.md"))
    assert.deepEqual(checkIndex(dir).extra, ["docs/a/two.md"])
})

test("findStale lists docs whose sources changed after Updated", () => {
    const dir = project({
        "src/app.js": "1\n",
        "docs/architecture/overview.md": doc("Overview", "Big picture.").replace("Updated: 2026-10-01", "Updated: 2026-10-05"),
        "docs/ui/theming.md": doc("Theming", "Themes.").replace("Updated: 2026-10-01", "Updated: 2026-10-20"),
        "docs/guides/setup.md": "# Setup\n\n> No sources.\n",
    })
    const git = (env, ...args) => execFileSync("git", args, { cwd: dir, env: { ...process.env, ...env } })
    git({}, "init", "-q", "-b", "main")
    git({}, "config", "user.name", "T")
    git({}, "config", "user.email", "t@example.com")
    git({}, "add", ".")
    const date = "2026-10-10T12:00:00"
    git({ GIT_AUTHOR_DATE: date, GIT_COMMITTER_DATE: date }, "commit", "-q", "-m", "init")
    assert.deepEqual(findStale(dir), [{ path: "docs/architecture/overview.md", updated: "2026-10-05", source: "src/", changed: "2026-10-10" }])
})

test("cli: index, check and usage", () => {
    const dir = project({ "docs/a/one.md": doc("One", "1.") })
    execFileSync("node", [cli, "index"], { cwd: dir })
    assert.match(readFileSync(join(dir, "CLAUDE.md"), "utf8"), /\[One\]\(docs\/a\/one\.md\) - 1\./)
    execFileSync("node", [cli, "check"], { cwd: dir })
    writeFileSync(join(dir, "docs", "a", "two.md"), doc("Two", "2."))
    assert.throws(() => execFileSync("node", [cli, "check"], { cwd: dir, stdio: "pipe" }), (error) => error.status === 1 && /docs\/a\/two\.md/.test(error.stdout))
    assert.throws(() => execFileSync("node", [cli, "nope"], { cwd: dir, stdio: "pipe" }), (error) => /Usage: docs-index\.mjs/.test(error.stderr))
})
