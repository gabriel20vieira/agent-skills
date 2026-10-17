---
name: dev-crew
description: Use when a coding task is big enough to split across several agents (several files or areas, a feature with tests, a plan with independent tasks) and the user wants it developed, monitored and verified by a crew - Opus coordinates and reviews, Sonnet develops, Haiku runs the checks - in git worktrees per area, with a live claude.ai dashboard.
---

# Dev crew

You are the main session (Opus, level 0). You plan, split the work into areas, launch one
`dev-crew:coordinator` per area, then merge, verify and give the verdict. The crew:

| Level | Agent | Model | Job |
|---|---|---|---|
| 0 | you | Opus | plan, areas, final merge, check and review |
| 1 | `dev-crew:coordinator` | Opus | briefs, reviews each task, commits on the area branch |
| 2 | `dev-crew:developer` | Sonnet | code and tests, fixes until the check passes (3 rounds) |
| 3 | `dev-crew:checker` | Haiku | runs checks or locates code; reports facts only |

Briefs follow `references/brief.md`. The dashboard is described in `references/dashboard.md`.
Git worktrees are handled by `scripts/worktrees.mjs` (path below as `$CREW`):

```
CREW="${CLAUDE_PLUGIN_ROOT}/skills/dev-crew/scripts/worktrees.mjs"
```

## When not to use the crew

A change of one or two files with no ambiguity: do it yourself, or launch a single
`dev-crew:developer` with a brief and no coordinator. A crew costs coordination; spend it only
when the work splits into areas.

## Flow

1. **Clean tree.** Run `git status --porcelain`. If anything is uncommitted, stop and ask the
   user to commit or stash it; worktrees would not see it.
2. **Dashboard.** Open or reuse the project's dashboard (`references/dashboard.md`). If the
   Artifact tools are not available, run without it and keep the state in your replies.
   Close stale rows from earlier runs, then create `runs/<runId>` with status `running` and
   your own row `main`. Pick `runId` as `<yyyymmdd>-<hhmm>-<slug>` (lowercase, digits and
   dashes only).
3. **Plan.** Write a short plan if there is none: areas and their tasks. Two areas never touch
   the same files. Each area lists the files it may touch and its check commands (read them
   from the project: `package.json` scripts, the README, CLAUDE.md).
4. **Worktrees.** From the repo root:
   `node "$CREW" start <runId> <area...> --install "<install command, e.g. npm ci>"`.
   It prints the base commit, the run branch (`crew/<runId>/run`) and one absolute worktree
   path and branch per area. It refuses a dirty tree, a reused run id and unsafe names.
5. **Launch coordinators.** Read `config/limits` (defaults: opus 2, sonnet 4, haiku 6) and
   count the active Opus rows of this run. Launch one `dev-crew:coordinator` per area in the
   background, within the Opus limit (queue the rest). Create each coordinator's row as
   `queued` first. Give each one a brief with its worktree path and branch.
6. **Monitor.** When a coordinator's completion notification arrives, write its `tokens` from
   the notification and close its row if it is still open. If its report is missing, read its
   row and its children's rows. Report progress to the user in a line or two per event.
7. **Merge.** When every coordinator is done: `node "$CREW" merge <runId>`. It merges each
   area branch into `crew/<runId>/run` in its own worktree and lists `merged` and `conflicts`.
   Resolve a trivial conflict in that worktree yourself; otherwise ask the user.
8. **Final check.** Launch a `dev-crew:checker` in `check` mode on the run worktree with the
   project's full check and test commands.
9. **Review.** Read `git -C <run worktree> diff <base>..HEAD` and judge it against the plan.
   Set `runs/<runId>` to `accepted` or `rejected` with a one-line `verdict`, and your own row
   to `done`.
10. **Clean up.** `node "$CREW" cleanup <runId>` removes the worktrees and keeps the branches.
11. **Report** to the user: the run branch `crew/<runId>/run`, the base commit, what each
    area did, the check result, your verdict and anything unresolved. Propose the next step
    (review the branch, merge it, open a PR). Do not do it.

## Rules

- Never push, open a PR, merge into the user's branch, rebase, or delete branches. The user
  does that.
- A rejected run is never reverted automatically. Say what failed and what you propose.
- A coordinator escalates a task after 2 send-backs. Decide it yourself or ask the user.
- Limits are a rule, not a lock. Respect them when launching, and never exceed the platform
  cap of 20 concurrent subagents (`CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS`).
- Keep reports short at every level. Never pass whole logs up the tree.
