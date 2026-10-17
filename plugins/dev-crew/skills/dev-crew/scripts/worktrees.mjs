#!/usr/bin/env node
// Git worktrees for a dev-crew run: one branch and worktree per area, merged into a run branch.
//
//   node worktrees.mjs start <runId> <area...> [--install "<cmd>"]
//   node worktrees.mjs merge <runId>
//   node worktrees.mjs cleanup <runId>
//   node worktrees.mjs finish <runId>
//
// Runs in the repo of the current folder and prints JSON. Branches: crew/<runId>/<area> per
// area and crew/<runId>/run for the merged result. Worktrees live next to the repo, in
// <repo>-crew/<runId>/<area> and <repo>-crew/<runId>/run. The run worktree exists from the
// start so docs and decisions can be committed on the run branch while the areas work.
// cleanup removes the worktrees and every area branch already in the run branch. finish, after
// the user merged the run branch into the current branch, deletes it locally and on origin.
// Never pushes code, never touches the user's checkout, never deletes unmerged work.
import { execFileSync, execSync } from "node:child_process"
import { existsSync, readdirSync, rmdirSync } from "node:fs"
import { basename, dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const ID = /^[a-z0-9][a-z0-9-]*$/
const RUN = "run"

function git(cwd, ...args) {
    return execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim()
}

/** Appends git's or the command's stderr to an execFileSync/execSync error. */
function withStderr(error) {
    const detail = error.stderr ? String(error.stderr).trim() : ""
    return new Error(detail ? `${error.message.split("\n")[0]}\n${detail}` : error.message)
}

function checkId(value) {
    if (typeof value !== "string" || !ID.test(value)) {
        throw new Error(`Invalid id "${value}": use lowercase letters, digits and dashes`)
    }
}

function areaBranches(repo, runId) {
    const refs = git(repo, "for-each-ref", "--format=%(refname:short)", `refs/heads/crew/${runId}/`)
    return refs.split("\n").filter(Boolean).filter((ref) => ref !== `crew/${runId}/${RUN}`).sort()
}

/** Folder that holds every crew worktree of `repo`: <parent>/<name>-crew. */
export function crewRoot(repo) {
    const path = resolve(repo)
    return join(dirname(path), `${basename(path)}-crew`)
}

/** Removes the run folder and then the crew root when they are empty. */
function isAncestor(repo, ref, target) {
    try {
        git(repo, "merge-base", "--is-ancestor", ref, target)
        return true
    } catch {
        return false
    }
}

function removeEmptyFolders(repo, runId) {
    const root = crewRoot(repo)
    for (const path of [join(root, runId), root]) {
        if (existsSync(path) && readdirSync(path).length === 0) rmdirSync(path)
    }
}

export function startRun({ repo, runId, areas, install }) {
    checkId(runId)
    if (!Array.isArray(areas) || areas.length === 0) throw new Error("At least one area is required")
    for (const area of areas) {
        checkId(area)
        if (area === RUN) throw new Error(`Area name "${RUN}" is reserved`)
    }
    if (git(repo, "status", "--porcelain") !== "") {
        throw new Error(`Uncommitted changes in ${repo}: commit or stash them before starting a run`)
    }
    if (git(repo, "for-each-ref", `refs/heads/crew/${runId}/`) !== "") {
        throw new Error(`Run ${runId} already exists`)
    }
    const base = git(repo, "rev-parse", "HEAD")
    const runBranch = `crew/${runId}/${RUN}`
    const runPath = join(crewRoot(repo), runId, RUN)
    const worktrees = []
    let runOpen = false
    try {
        git(repo, "branch", runBranch, base)
        git(repo, "worktree", "add", "-q", runPath, runBranch)
        runOpen = true
        for (const area of areas) {
            const branch = `crew/${runId}/${area}`
            const path = join(crewRoot(repo), runId, area)
            git(repo, "worktree", "add", "-q", "-b", branch, path, base)
            worktrees.push({ area, branch, path })
            if (install) execSync(install, { cwd: path, stdio: "pipe" })
        }
    } catch (error) {
        // Roll back so the same run id can be retried: nothing of this call survives.
        for (const path of [...(runOpen ? [runPath] : []), ...worktrees.map((tree) => tree.path)]) {
            try { git(repo, "worktree", "remove", "--force", path) } catch {}
        }
        for (const branch of [runBranch, ...worktrees.map((tree) => tree.branch)]) {
            try { git(repo, "branch", "-D", branch) } catch {}
        }
        removeEmptyFolders(repo, runId)
        throw withStderr(error)
    }
    return { base, runBranch, runPath, worktrees }
}

export function mergeRun({ repo, runId }) {
    checkId(runId)
    const runBranch = `crew/${runId}/${RUN}`
    if (git(repo, "for-each-ref", `refs/heads/${runBranch}`) === "") throw new Error(`Run ${runId} not found`)
    const path = join(crewRoot(repo), runId, RUN)
    if (!existsSync(path)) git(repo, "worktree", "add", "-q", path, runBranch)
    const dirty = git(path, "status", "--porcelain")
    if (dirty !== "") throw new Error(`Run worktree ${path} has uncommitted changes: commit or discard them first\n${dirty}`)
    const merged = []
    const conflicts = []
    for (const branch of areaBranches(repo, runId)) {
        const area = branch.slice(`crew/${runId}/`.length)
        try {
            git(path, "merge", "--no-ff", "-m", `merge ${branch}`, branch)
            merged.push(area)
        } catch (error) {
            let merging = true
            try { git(path, "rev-parse", "-q", "--verify", "MERGE_HEAD") } catch { merging = false }
            if (!merging) throw withStderr(error)
            git(path, "merge", "--abort")
            conflicts.push(area)
        }
    }
    return { path, merged, conflicts }
}

export function cleanupRun({ repo, runId }) {
    checkId(runId)
    const folder = join(crewRoot(repo), runId)
    const paths = [join(folder, RUN)]
    for (const branch of areaBranches(repo, runId)) paths.push(join(folder, branch.slice(`crew/${runId}/`.length)))
    const removed = []
    for (const path of paths) {
        if (!existsSync(path)) continue
        git(repo, "worktree", "remove", "--force", path)
        removed.push(path)
    }
    // Drops the records of worktrees whose folder was deleted by hand.
    git(repo, "worktree", "prune")
    removeEmptyFolders(repo, runId)
    const deleted = []
    const kept = []
    const runBranch = `crew/${runId}/${RUN}`
    const hasRun = git(repo, "for-each-ref", `refs/heads/${runBranch}`) !== ""
    for (const branch of areaBranches(repo, runId)) {
        if (!hasRun || !isAncestor(repo, branch, runBranch)) {
            kept.push(branch)
            continue
        }
        git(repo, "branch", "-D", branch)
        deleted.push(branch)
    }
    return { removed, deleted, kept }
}

export function finishRun({ repo, runId }) {
    checkId(runId)
    const runBranch = `crew/${runId}/${RUN}`
    if (git(repo, "for-each-ref", `refs/heads/${runBranch}`) === "") throw new Error(`Run ${runId} not found`)
    if (existsSync(join(crewRoot(repo), runId)) || areaBranches(repo, runId).length > 0) {
        throw new Error(`Run ${runId} still has worktrees or area branches: run cleanup ${runId} first`)
    }
    const current = git(repo, "branch", "--show-current")
    if (!isAncestor(repo, runBranch, "HEAD")) throw new Error(`${runBranch} is not merged into ${current || "HEAD"}`)
    git(repo, "branch", "-D", runBranch)
    const remote = []
    let remotes = ""
    try { remotes = git(repo, "remote") } catch { remotes = "" }
    if (remotes.split("\n").includes("origin") && git(repo, "ls-remote", "--heads", "origin", runBranch) !== "") {
        git(repo, "push", "-q", "origin", "--delete", runBranch)
        remote.push(runBranch)
    }
    return { deleted: [runBranch], remote }
}

function main(argv) {
    const [command, runId, ...rest] = argv
    const usage = "Usage: worktrees.mjs start <runId> <area...> [--install \"<cmd>\"] | merge <runId> | cleanup <runId> | finish <runId>"
    const repo = resolve(git(process.cwd(), "rev-parse", "--show-toplevel"))
    if (command === "start") {
        const at = rest.indexOf("--install")
        const install = at >= 0 ? rest[at + 1] : undefined
        if (at >= 0 && (!install || install.startsWith("--"))) throw new Error(`--install needs a command\n${usage}`)
        const areas = at >= 0 ? rest.filter((_, index) => index !== at && index !== at + 1) : rest
        return startRun({ repo, runId, areas, install })
    }
    if (command === "merge") return mergeRun({ repo, runId })
    if (command === "cleanup") return cleanupRun({ repo, runId })
    if (command === "finish") return finishRun({ repo, runId })
    throw new Error(usage)
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    try {
        console.log(JSON.stringify(main(process.argv.slice(2)), null, 4))
    } catch (error) {
        console.error(error.message)
        process.exit(1)
    }
}
