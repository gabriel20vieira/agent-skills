---
name: dev-crew
description: Use when a task is big enough to split across several agents - a feature across several files or areas, a plan with independent tasks, or reading and analysing a large body of code or documentation - and the user wants it done, verified and documented by a crew where each role runs on the model suited to it (plan and review on Fable or Opus, develop on Sonnet, check on Haiku), in git worktrees per area for code.
---

# Dev crew

You are the principal: the session itself. You read and understand, break the problem into
tasks, say which can run at the same time, pick a role for each task, and in the end merge,
verify and give the verdict. You write only text (plan, briefs, report, verdict), never code.

## Four roles, not a hierarchy

Each role is a function, run on the model suited to it. Whoever needs a function launches it
directly: the principal launches a coordinator only when a task has to be split up, sends a
single task straight to a developer, and a verification straight to a checker. The order
principal > coordinator > developer > checker is only the names.

| Role | Agent | Default model | Function |
|---|---|---|---|
| principal | you (the session) | Fable or Opus | understand, decompose, decide what runs in parallel, merge, review, verdict |
| coordinator | `dev-crew:coordinator` | Opus | takes one task that must be distributed, splits it among developers, reviews what comes back |
| developer | `dev-crew:developer` | Sonnet | does one concrete task: code with tests, or reads one slice and reports findings with citations |
| checker | `dev-crew:checker` | Haiku | reads, verifies and correlates: runs checks, locates code, confirms claims against sources |
| scribe | `dev-crew:scribe` | Opus | writes decisions and docs under `docs/`, `CLAUDE.md` if missing |

Models come from `crew.models` in `docs/settings.md` (`principal fable|opus, coordinator
opus, developer sonnet, checker haiku, scribe opus`). Pass the role's model as the Agent
tool's `model` on every launch; the agent files only carry the defaults. You are the
session's model: if it differs from `principal`, tell the user to switch with `/model` before
going on. Limits come from `crew.limits` (`coordinator N, developer N, checker N`; defaults
2, 4, 6): each launcher counts only the agents it launched itself.

Briefs follow `references/brief.md`. What to read, which skills to pick and how docs are kept
is in `references/docs.md`. Git worktrees are handled by `scripts/worktrees.mjs` (path below as
`$CREW`):

```
CREW="${CLAUDE_PLUGIN_ROOT}/skills/dev-crew/scripts/worktrees.mjs"
```

## When not to use the crew

A change of one or two files with no ambiguity, or a question one file answers: do it
yourself, or launch a single developer or checker with a brief. A crew costs coordination;
spend it only when the work splits. Still record any real decision it involves (a scribe, or a
file under `docs/decisions/` yourself).

## Two modes

Decide the mode from the task before planning, and say which you chose:

- **`code`**: the result is code in the repo (a feature, a refactor, tests). Worktrees per
  area, commits on area branches, checks before anything is accepted.
- **`analysis`**: the result is understanding (research, reading, an audit, a review of a
  large codebase or body of docs). No git: the corpus is split into slices, each slice is
  read and reported with citations, every claim is verified against its source, and the
  findings are correlated into one report under `docs/`.

A task may need both: analyse first (what is there, what must change), then code. Run them
as two passes with their own plan.

## Common start

1. **Clean tree.** Run `git status --porcelain`. If anything is uncommitted, stop and ask the
   user to commit or stash it. The run starts from the current branch: if `git.baseBranch` in
   `docs/settings.md` is set and you are on another branch, ask the user before going on.
2. **Context.** Read `CLAUDE.md`, the README and the project's specs, plans and earlier
   decisions under `docs/` (`references/docs.md`). Specs and docs come first: they say what
   was already decided. Then choose the skills from this session's skills and plugins that
   matter for the task, and the docs each agent must read. Note whether `CLAUDE.md` is
   missing. Read `docs/settings.md`: for each setting the run will use (`crew.models`,
   `crew.limits`, `git.deleteMergedBranches`, `docs.language`, `checks.beforeCommit`) that is
   empty or missing, ask the user now, in one question, and have the first scribe write the
   answers there. Check your own model against `principal`.
3. **Plan.** Write a short plan: the mode, the tasks, which tasks can run at the same time
   (they share no files and no slice), and the role each task goes to: a coordinator when
   the task itself splits into pieces, a developer for one piece, a checker for a
   verification. Record the decisions the plan makes. Pick `runId` as
   `<yyyymmdd>-<hhmm>-<slug>` (lowercase, digits and dashes only).
4. **Record the plan.** Launch a scribe in the background with the plan, the decisions, the
   skills and docs chosen, and whether `CLAUDE.md` is missing. In `code` mode it works on
   `runPath` (step 5 below); in `analysis` mode on the repo itself, in `docs/`.

## Mode `code`

5. **Worktrees.** One area per task group that touches its own files; two areas never touch
   the same files. From anywhere in the repo:
   `node "$CREW" start <runId> <area...> --install "<install command, e.g. npm ci>"`.
   It prints the base commit, the run branch (`crew/<runId>/run`) and its worktree
   (`runPath`), and one worktree path and branch per area (`<repo>-crew/<runId>/<area>`, next
   to the repo); use the paths exactly as printed. It refuses a dirty tree, a reused run id
   and unsafe names, and leaves nothing behind when it fails. Each area's check commands
   come from `checks.beforeCommit` first, then the project's `package.json` scripts, README
   and `CLAUDE.md`.
6. **Launch.** For each area, in the background and within `crew.limits`: a coordinator when
   the area has several tasks (give it `Quota: up to <n> developer at once`, its share of the
   developer limit, at least 1), or a developer directly when it has one. Every brief carries
   `Mode: code`, the worktree path and branch, `Model:`, `Skills:` and `Read first:`.
7. **Monitor.** Keep your own list of the agents you launched and their state. When one
   finishes, read its report and tell the user in a line or two what it did. An agent that
   ends without a report counts as failed: say so and decide whether to relaunch it. A
   developer you launched directly does not commit: review its diff and commit its files on
   the area branch yourself (`git -C <worktree> add -- <files>` then commit), or send it
   back once with corrections. Send the decisions and results from each report to a scribe
   (one at a time; batch reports that arrive together).
8. **Merge.** When everything is done: `node "$CREW" merge <runId>`. It merges each area
   branch into `crew/<runId>/run` in the run worktree and lists `merged` and `conflicts`.
   Resolve a trivial conflict there yourself; otherwise ask the user.
9. **Final check.** Launch a checker in `check` mode on the run worktree with the project's
   full check and test commands.
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

## Mode `analysis`

5. **Slices.** Split the corpus into slices a developer can read whole (a folder, a module,
   a set of documents, one question across the corpus). Name the questions every slice must
   answer. Findings go to `docs/analysis/<runId>/<slice>.md`; the report to
   `docs/analysis/<runId>/report.md` (or the project's own layout when it has one).
6. **Launch.** In the background and within `crew.limits`: a coordinator for a group of
   slices that share the questions (it splits them among developers and merges their
   findings), or a developer directly for one slice. Every brief carries `Mode: analysis`,
   `Inputs:` (what to read), `Output:` (the findings file), the questions, `Model:`,
   `Skills:` and `Read first:`. Findings are claims with citations (`file:line`, a document
   and section, a URL), never summaries without a source.
7. **Monitor.** As in `code`: your own list, a line or two to the user per report, failed
   when no report, decisions to a scribe.
8. **Verify.** For each findings file, launch a checker in `verify` mode with the file and
   its inputs: it rereads the sources, marks every claim `confirmed`, `wrong` or `unsupported`,
   and lists what the slices contradict or miss between them. Send wrong and unsupported
   claims back to a developer once; drop what still fails and say so.
9. **Report.** Write `report.md` yourself from the verified findings: answers to the
   questions, the evidence (citations kept), the contradictions and gaps, and what you
   recommend. Judge it against the task and the docs read in step 2.
10. **Record the outcome.** Launch a last scribe with the decisions, the report path and the
    open items, and wait for it. The scribe commits the findings and the report on the
    current branch, as docs.
11. **Report** to the user: the report path, the main answers in a few lines, what could not
    be verified, and the next step you propose (a `code` run, more analysis, nothing).

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
- Keep reports short at every level. Never pass whole logs or whole documents up the tree:
  findings carry citations, not copies.
