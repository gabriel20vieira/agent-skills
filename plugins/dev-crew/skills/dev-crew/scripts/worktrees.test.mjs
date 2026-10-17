// node --test plugins/dev-crew/skills/dev-crew/scripts/worktrees.test.mjs
import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { after, test } from "node:test"
import { cleanupRun, crewRoot, mergeRun, startRun } from "./worktrees.mjs"

const cli = join(import.meta.dirname, "worktrees.mjs")

const root = mkdtempSync(join(tmpdir(), "crew-worktrees-"))
after(() => rmSync(root, { recursive: true, force: true }))

let count = 0

function git(cwd, ...args) {
    return execFileSync("git", args, { cwd, encoding: "utf8" }).trim()
}

/** A fresh repo with one commit, in its own parent folder so crewRoot stays inside `root`. */
function makeRepo() {
    const repo = join(root, `case-${++count}`, "repo")
    mkdirSync(repo, { recursive: true })
    git(repo, "init", "-q", "-b", "main")
    git(repo, "config", "user.name", "Test")
    git(repo, "config", "user.email", "test@example.com")
    git(repo, "config", "core.autocrlf", "false")
    writeFileSync(join(repo, "shared.txt"), "one\n")
    git(repo, "add", ".")
    git(repo, "commit", "-q", "-m", "init")
    return repo
}

function branches(repo) {
    return git(repo, "branch", "--format=%(refname:short)").split("\n").filter(Boolean).sort()
}

function commitIn(path, file, content) {
    writeFileSync(join(path, file), content)
    git(path, "add", file)
    git(path, "commit", "-q", "-m", `edit ${file}`)
}

test("startRun creates run and area branches with worktrees", () => {
    const repo = makeRepo()
    const head = git(repo, "rev-parse", "HEAD")
    const run = startRun({ repo, runId: "r1", areas: ["api", "ui"] })
    assert.equal(run.base, head)
    assert.equal(run.runBranch, "crew/r1/run")
    assert.deepEqual(branches(repo), ["crew/r1/api", "crew/r1/run", "crew/r1/ui", "main"])
    assert.deepEqual(run.worktrees.map((tree) => tree.area), ["api", "ui"])
    for (const tree of run.worktrees) {
        assert.equal(tree.branch, `crew/r1/${tree.area}`)
        assert.equal(tree.path, join(crewRoot(repo), `r1-${tree.area}`))
        assert.ok(existsSync(join(tree.path, "shared.txt")))
    }
})

test("startRun refuses a dirty tree", () => {
    const repo = makeRepo()
    writeFileSync(join(repo, "loose.txt"), "x\n")
    assert.throws(() => startRun({ repo, runId: "r1", areas: ["api"] }), /Uncommitted changes/)
    assert.deepEqual(branches(repo), ["main"])
})

test("startRun rejects unsafe ids", () => {
    const repo = makeRepo()
    for (const bad of ["R 1", "a/b", "..", "UI", ""]) {
        assert.throws(() => startRun({ repo, runId: bad, areas: ["api"] }), /Invalid id/, `runId ${bad}`)
        assert.throws(() => startRun({ repo, runId: "r1", areas: [bad] }), /Invalid id/, `area ${bad}`)
    }
    assert.throws(() => startRun({ repo, runId: "r1", areas: [] }), /At least one area/)
    assert.throws(() => startRun({ repo, runId: "r1", areas: ["run"] }), /reserved/)
    assert.deepEqual(branches(repo), ["main"])
})

test("startRun refuses an existing run", () => {
    const repo = makeRepo()
    startRun({ repo, runId: "r1", areas: ["api"] })
    assert.throws(() => startRun({ repo, runId: "r1", areas: ["ui"] }), /already exists/)
})

test("startRun runs install in each worktree", () => {
    const repo = makeRepo()
    const install = "node -e \"require('fs').writeFileSync('x','1')\""
    const run = startRun({ repo, runId: "r1", areas: ["api", "ui"], install })
    for (const tree of run.worktrees) assert.ok(existsSync(join(tree.path, "x")), tree.area)
})

test("mergeRun merges every area", () => {
    const repo = makeRepo()
    const run = startRun({ repo, runId: "r1", areas: ["api", "ui"] })
    commitIn(run.worktrees[0].path, "api.txt", "api\n")
    commitIn(run.worktrees[1].path, "ui.txt", "ui\n")
    const result = mergeRun({ repo, runId: "r1" })
    assert.deepEqual(result.merged, ["api", "ui"])
    assert.deepEqual(result.conflicts, [])
    assert.equal(result.path, join(crewRoot(repo), "r1"))
    assert.ok(existsSync(join(result.path, "api.txt")))
    assert.ok(existsSync(join(result.path, "ui.txt")))
    assert.equal(git(repo, "rev-parse", "--abbrev-ref", "HEAD"), "main")
})

test("mergeRun reports conflicts and keeps the rest", () => {
    const repo = makeRepo()
    const run = startRun({ repo, runId: "r1", areas: ["api", "ui"] })
    commitIn(run.worktrees[0].path, "shared.txt", "api\n")
    commitIn(run.worktrees[1].path, "shared.txt", "ui\n")
    const result = mergeRun({ repo, runId: "r1" })
    assert.deepEqual(result.merged, ["api"])
    assert.deepEqual(result.conflicts, ["ui"])
    assert.equal(git(result.path, "status", "--porcelain"), "")
})

test("cleanupRun removes worktrees and keeps branches", () => {
    const repo = makeRepo()
    const run = startRun({ repo, runId: "r1", areas: ["api", "ui"] })
    const merged = mergeRun({ repo, runId: "r1" })
    const result = cleanupRun({ repo, runId: "r1" })
    assert.equal(result.removed.length, 3)
    for (const tree of run.worktrees) assert.ok(!existsSync(tree.path))
    assert.ok(!existsSync(merged.path))
    assert.deepEqual(branches(repo), ["crew/r1/api", "crew/r1/run", "crew/r1/ui", "main"])
})

test("startRun rolls back when install fails and reports its stderr", () => {
    const repo = makeRepo()
    const install = "node -e \"if (process.cwd().endsWith('-ui')) { console.error('boom-ui'); process.exit(3) }\""
    assert.throws(() => startRun({ repo, runId: "r1", areas: ["api", "ui"], install }), /boom-ui/)
    assert.deepEqual(branches(repo), ["main"])
    assert.ok(!existsSync(join(crewRoot(repo), "r1-api")))
    assert.ok(!existsSync(crewRoot(repo)))
    startRun({ repo, runId: "r1", areas: ["api"] })
})

test("mergeRun refuses a dirty run worktree with a clear message", () => {
    const repo = makeRepo()
    const run = startRun({ repo, runId: "r1", areas: ["api"] })
    commitIn(run.worktrees[0].path, "shared.txt", "api\n")
    const first = mergeRun({ repo, runId: "r1" })
    writeFileSync(join(first.path, "shared.txt"), "half-done\n")
    assert.throws(() => mergeRun({ repo, runId: "r1" }), /Run worktree .* has uncommitted changes/)
})

test("cli resolves the repo root from a subfolder", () => {
    const repo = makeRepo()
    const sub = join(repo, "packages", "web")
    mkdirSync(sub, { recursive: true })
    const out = JSON.parse(execFileSync("node", [cli, "start", "r1", "api"], { cwd: sub, encoding: "utf8" }))
    assert.equal(out.worktrees[0].path, join(crewRoot(repo), "r1-api"))
    assert.equal(git(repo, "status", "--porcelain"), "")
})
