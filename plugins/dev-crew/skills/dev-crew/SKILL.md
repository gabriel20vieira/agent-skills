---
name: dev-crew
description: Use when a coding task is big enough to split across several agents (several files or areas, a feature with tests, a plan with independent tasks) and the user wants it developed, monitored, verified and documented by a crew - Opus coordinates, reviews and records decisions, Sonnet develops, Haiku runs the checks - in git worktrees per area.
---

# Dev crew

You are the main session (Opus, level 0). You read what the project already knows, choose the
skills that matter, plan, split the work into areas, launch one `dev-crew:coordinator` per
area, have every decision written down by a `dev-crew:scribe`, then merge, verify and give the
verdict. The crew:

| Level | Agent | Model | Job |
|---|---|---|---|
| 0 | you | Opus | context, plan, areas, final merge, check and review |
| 1 | `dev-crew:scribe` | Opus | decisions and docs in `docs/*.md`, `CLAUDE.md` if missing |
| 1 | `dev-crew:coordinator` | Opus | briefs, reviews each task, commits on the area branch |
| 2 | `dev-crew:developer` | Sonnet | code and tests, fixes until the check passes (3 rounds) |
| 3 | `dev-crew:checker` | Haiku | runs checks or locates code; reports facts only |

Briefs follow `references/brief.md`. What to read, which skills to pick and how docs are kept
is in `references/docs.md`. Git worktrees are handled by `scripts/worktrees.mjs` (path below as
`$CREW`):

```
CREW="${CLAUDE_PLUGIN_ROOT}/skills/dev-crew/scripts/worktrees.mjs"
```

## When not to use the crew

A change of one or two files with no ambiguity: do it yourself, or launch a single
`dev-crew:developer` with a brief and no coordinator. A crew costs coordination; spend it only
when the work splits into areas. Still record any real decision it involves (a scribe, or a
file under `docs/decisions/` yourself).

## Flow

1. **Clean tree.** Run `git status --porcelain`. If anything is uncommitted, stop and ask the
   user to commit or stash it; worktrees would not see it. The run starts from the current
   branch: if `git.baseBranch` in `docs/settings.md` is set and you are on another branch,
   ask the user before going on.
2. **Context.** Read `CLAUDE.md`, the README and the project's specs, plans and earlier
   decisions under `docs/` (`references/docs.md`). Specs and docs come first: they say what
   was already decided. Then choose the skills from this session's skills and plugins that
   matter for the task, and the docs each area must read. Note whether `CLAUDE.md` is missing.
   Read `docs/settings.md` (project settings, `references/docs.md`). For each setting the
   run will use (`git.deleteMergedBranches`, `docs.language`, `crew.limits`,
   `checks.beforeCommit`) that is empty or missing, ask the user now, in one question, and
   have the first scribe write the answers there.
3. **Plan.** Write a short plan if there is none: areas and their tasks, the skills and docs
   chosen, and the decisions it makes. Two areas never touch the same files. Each area lists
   the files it may touch and its check commands (`checks.beforeCommit` first, then the
   project's `package.json` scripts, the README, `CLAUDE.md`). Pick `runId` as
   `<yyyymmdd>-<hhmm>-<slug>` (lowercase, digits and dashes only).
4. **Worktrees.** From anywhere in the repo:
   `node "$CREW" start <runId> <area...> --install "<install command, e.g. npm ci>"`.
   It prints the base commit, the run branch (`crew/<runId>/run`) and its worktree
   (`runPath`), and one worktree path and branch per area (`<repo>-crew/<runId>/<area>`, next
   to the repo); use the paths exactly as printed. It refuses a dirty tree, a reused run id
   and unsafe names, and leaves nothing behind when it fails.
5. **Record the plan.** Launch a `dev-crew:scribe` in the background on `runPath` with the
   plan, the decisions, the skills and docs chosen, and whether `CLAUDE.md` is missing. It
   writes the run doc, the decision files and, when missing, `CLAUDE.md`.
6. **Launch coordinators.** Take the limits from `crew.limits` (defaults: opus 2, sonnet 4,
   haiku 6). Launch one `dev-crew:coordinator` per area in the background, at most the Opus
   limit at once (the scribe and you do not count); queue the rest and launch each when one
   finishes. Share the Sonnet limit between the coordinators running at once and put each
   share in its brief as `Quota: up to <n> sonnet at once` (at least 1). Each brief also
   carries its worktree path and branch, `Skills:` and `Read first:`.
7. **Monitor.** Keep your own list of the agents you launched and their state. When a
   coordinator's completion notification arrives, read its report and tell the user in a line
   or two what it did. A coordinator that ends without a report counts as failed: say so and
   decide whether to relaunch it. Send the decisions and results from each report to a scribe
   (one at a time; batch reports that arrive together).
8. **Merge.** When every coordinator and scribe is done: `node "$CREW" merge <runId>`. It
   merges each area branch into `crew/<runId>/run` in the run worktree and lists `merged` and
   `conflicts`. Resolve a trivial conflict there yourself; otherwise ask the user.
9. **Final check.** Launch a `dev-crew:checker` in `check` mode on the run worktree with the
   project's full check and test commands.
10. **Review.** Read `git -C <runPath> diff <base>..HEAD` and judge it against the plan and the
    docs read in step 2. Decide `accepted` or `rejected`, with a one-line verdict.
11. **Record the outcome.** Launch a last scribe with the checks, the verdict and the open
    items, and wait for it.
12. **Clean up.** `node "$CREW" cleanup <runId>` removes the worktrees and deletes every
    area branch already in the run branch. With `git.deleteMergedBranches` set to `no`, run
    `cleanup <runId> --keep-branches` instead (with `ask`, ask first). It lists `kept`
    area branches (conflicts not yet merged): resolve them or ask the user, then run cleanup
    again.
13. **Report** to the user: the run branch `crew/<runId>/run`, the base commit, what each
    area did, the check result, your verdict, the docs written (and `CLAUDE.md` if created),
    and anything unresolved. Propose the next step (review the branch, merge it, open a PR).
    Do not do it.
14. **Finish.** Once the user has merged the run branch (locally or through a PR), follow
    `git.deleteMergedBranches`: with `yes`, from the branch it went into, run
    `node "$CREW" finish <runId>`. It deletes `crew/<runId>/run` locally and on `origin`,
    and refuses if it is not merged. With `ask` (or still empty), ask the user first. With
    `no`, keep it.

## Rules

- Never push code, open a PR, merge into the user's branch or rebase. The user does that.
- Crew worktrees are always removed at the end. Deleting merged branches (area branches in
  step 12, the run branch in step 14, any other merged branch of the task) follows
  `git.deleteMergedBranches` in `docs/settings.md`; when it is empty, ask once and record
  the answer. Never delete a branch whose commits are not merged, or a worktree with
  uncommitted files.
- Every real decision ends up in a file under `docs/`, written by a scribe. Nothing important
  lives only in the conversation.
- A rejected run is never reverted automatically. Say what failed and what you propose.
- A coordinator escalates a task after 2 send-backs. Decide it yourself or ask the user.
- Limits are a rule, not a lock. Each launcher counts only the agents it launched itself and
  stays within its quota. Never exceed the platform cap of 20 concurrent subagents
  (`CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS`).
- Keep reports short at every level. Never pass whole logs up the tree.
