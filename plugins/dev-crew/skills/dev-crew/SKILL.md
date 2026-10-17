---
name: dev-crew
description: Use when a coding task is big enough to split across several agents (several files or areas, a feature with tests, a plan with independent tasks) and the user wants it developed, monitored, verified and documented by a crew - Opus coordinates, reviews and records decisions, Sonnet develops, Haiku runs the checks - in git worktrees per area, with a live claude.ai dashboard.
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
is in `references/docs.md`. The dashboard is described in `references/dashboard.md`. Git
worktrees are handled by `scripts/worktrees.mjs` (path below as `$CREW`):

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
   user to commit or stash it; worktrees would not see it.
2. **Context.** Read `CLAUDE.md`, the README and the project's specs, plans and earlier
   decisions under `docs/` (`references/docs.md`). Specs and docs come first: they say what
   was already decided. Then choose the skills from this session's skills and plugins that
   matter for the task, and the docs each area must read. Note whether `CLAUDE.md` is missing.
3. **Plan.** Write a short plan if there is none: areas and their tasks, the skills and docs
   chosen, and the decisions it makes. Two areas never touch the same files. Each area lists
   the files it may touch and its check commands (from the project: `package.json` scripts,
   the README, `CLAUDE.md`). Pick `runId` as `<yyyymmdd>-<hhmm>-<slug>` (lowercase, digits
   and dashes only).
4. **Worktrees.** From anywhere in the repo:
   `node "$CREW" start <runId> <area...> --install "<install command, e.g. npm ci>"`.
   It prints the base commit, the run branch (`crew/<runId>/run`) and its worktree
   (`runPath`), and one worktree path and branch per area (`<repo>-crew/<runId>/<area>`, next
   to the repo); use the paths exactly as printed. It refuses a dirty tree, a reused run id
   and unsafe names, and leaves nothing behind when it fails.
5. **Dashboard.** Open or reuse the project's dashboard (`references/dashboard.md`). If the
   Artifact tools are not available, run without it and keep the state in your replies.
   Close stale rows from earlier runs, then create `runs/<runId>` with status `running` and
   your own row `main`.
6. **Record the plan.** Launch a `dev-crew:scribe` in the background on `runPath` with the
   plan, the decisions, the skills and docs chosen, and whether `CLAUDE.md` is missing. It
   writes the run doc, the decision files and, when missing, `CLAUDE.md`.
7. **Launch coordinators.** Read `config/limits` (defaults: opus 2, sonnet 4, haiku 6) and
   count the active Opus rows of this run, not counting `main` or the scribe (both are outside
   the limits). Launch one `dev-crew:coordinator` per area in the background, within the Opus
   limit (queue the rest). Create each coordinator's row as `queued` first. Its brief carries
   its worktree path and branch, `Skills:` and `Read first:`.
8. **Monitor.** When a coordinator's completion notification arrives, write its `tokens` from
   the notification and close its row if it is still open. If its report is missing, read its
   row and its children's rows. Report progress to the user in a line or two per event. Send
   the decisions and results from each report to a scribe (one at a time; batch reports that
   arrive together).
9. **Merge.** When every coordinator and scribe is done: `node "$CREW" merge <runId>`. It
   merges each area branch into `crew/<runId>/run` in the run worktree and lists `merged` and
   `conflicts`. Resolve a trivial conflict there yourself; otherwise ask the user.
10. **Final check.** Launch a `dev-crew:checker` in `check` mode on the run worktree with the
    project's full check and test commands.
11. **Review.** Read `git -C <runPath> diff <base>..HEAD` and judge it against the plan and the
    docs read in step 2. Set `runs/<runId>` to `accepted` or `rejected` with a one-line
    `verdict`.
12. **Record the outcome.** Launch a last scribe with the checks, the verdict and the open
    items, and wait for it. Then set your own row to `done`.
13. **Clean up.** `node "$CREW" cleanup <runId>` removes the worktrees and deletes every
    area branch already in the run branch. It lists `kept` area branches (conflicts not yet
    merged): resolve them or ask the user, then run cleanup again. Only `crew/<runId>/run`
    remains.
14. **Report** to the user: the run branch `crew/<runId>/run`, the base commit, what each
    area did, the check result, your verdict, the docs written (and `CLAUDE.md` if created),
    and anything unresolved. Propose the next step (review the branch, merge it, open a PR).
    Do not do it.
15. **Finish.** As soon as the user has merged the run branch (locally or through a PR), from
    the branch it went into: `node "$CREW" finish <runId>`. It deletes `crew/<runId>/run`
    locally and on `origin`, and refuses if it is not merged. Leave no crew branch or
    worktree behind.

## Rules

- Never push code, open a PR, merge into the user's branch or rebase. The user does that.
- Always delete extra branches and worktrees once their work is merged: area branches in
  step 13, the run branch in step 15 (local and remote). The same goes for any other merged
  feature branch or worktree of the task, including after a PR is merged. Never delete a
  branch whose commits are not merged, or a worktree with uncommitted files.
- Every real decision ends up in a file under `docs/`, written by a scribe. Nothing important
  lives only in the conversation.
- A rejected run is never reverted automatically. Say what failed and what you propose.
- A coordinator escalates a task after 2 send-backs. Decide it yourself or ask the user.
- Limits are a rule, not a lock. Respect them when launching, and never exceed the platform
  cap of 20 concurrent subagents (`CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS`).
- Keep reports short at every level. Never pass whole logs up the tree.
