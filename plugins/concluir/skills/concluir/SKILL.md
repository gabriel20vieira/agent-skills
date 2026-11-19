---
name: concluir
description: Use when the user asks to close the cycle of the parallel sessions (forks) started from this one - "concluir", join or close the forks, "tests > merge > push > PR", or /concluir - collects the finished forks (worktrees and branches), checks with the user what is done in the conversation and in each fork, reviews the code, merges into the integration branch, runs the full test suite and fixes until it passes, makes atomic commits, pushes, opens or updates the PR to the base branch and cleans up forks, worktrees and branches.
---

# Concluir

This session is the coordinator. Forks (sessions started from this one) write code and tests in
their own worktrees and branches; here the work is collected, checked, tested, fixed and
published. Speak to the user in their language.

Arguments: `merge` lets you merge the PR at the end (only with CI green); `into <branch>`
overrides the integration branch for this run.

## 0. Project settings

Read the project's `CLAUDE.md` and `docs/settings.md`. This skill uses (`references/settings.md`
has the rows to add when they are missing):

- `git.integrationBranch`: where forks are merged (for example `development`); may be the same as
  `git.baseBranch`.
- `git.baseBranch`: the branch the PR targets (for example `main`).
- `checks.full`: the full test suite, with what must be running first (containers, services) and
  any extra suite and when it applies.
- `git.mergeMethod`, `git.pushAndPr`, `git.deleteMergedBranches`.

A value that is empty: ask the user once, with the options, and write the answer in
`docs/settings.md` (committed with this run's fixes). `ask`: ask every time. Also take from
`CLAUDE.md` the project's rules for review, its commit message style and the secrets it names.

## Rules for the whole run

- The folder may be shared with other sessions: **never** `stash`, `reset`, `checkout` of another
  branch or `clean`. Work on the integration branch; commit only files this session changed.
- No secrets (keys, tokens, passwords, PINs, phone numbers, the ones `CLAUDE.md` names) in logs,
  chat, commands or commit messages.
- The base branch only changes through a PR. **The merge of the PR is the user's**, unless they
  asked for it in this invocation (`merge`).
- Long commands (the suite) run in the background, with the log in the scratchpad; never poll,
  wait for the notification.
- Never `--force`, never `git add -A`, never weaken a test to make it pass.

## 1. Collect the forks

1. List the sessions started from this one (`list_sessions` with `linked: true` in the Claude
   app) and their state.
   - One still working: say which and wait for its note (never poll). Do not join half of them
     unless the user asks.
   - One waiting for the user: say so and leave it alone.
2. For each finished fork, read its report (its last messages or events) and note: branch,
   commits, migrations or schema changes, what it left undecided or unverified, tests written.
3. Per branch:
   ```bash
   git log --oneline <integration>..refs/heads/<branch>
   git diff --stat <integration>...refs/heads/<branch>
   ```
   A branch with no commits means the fork did not deliver: tell the user and leave it.
   `git worktree list` shows each worktree and its branch.
4. Overlaps between branches (`git diff --name-only` of each, files in common), to know where
   conflicts will come from and in which order to merge (first the one with the lowest migration
   or schema version).

## 2. Is everything done? Settle it with the user first

Before merging anything, take stock of what was asked and what is done
(`references/status-report.md`):

1. **This conversation**: each request since the last run (and the summary, if the context was
   compacted): done and committed, done but not committed, handed to a fork, or still to do.
   Also `git status --short` (uncommitted changes: this session's or another's?) and
   `git log --oneline origin/<integration>..<integration>` (local commits not yet pushed,
   including ones other sessions made directly on the integration branch).
2. **Forks**: compare each brief with its report and diff: all, part or nothing delivered; what
   is undecided or unverified; commits made after it was already merged (need a new merge);
   research forks whose result has not reached the user yet.
3. **Show the user** a short numbered list, one line per request: ✔ done · ◐ partial (what is
   missing) · ✘ not done · ? to decide, with the questions only they can answer.
4. **Wait for the answer** before step 3 (`wrap_up` with the question and `blocked: true` in the
   Claude app). Go on without an answer only when everything is ✔ and nothing is undecided; still
   show the list.

## 3. Review the code

Before merging, read each branch's diff (hand large ones to a reviewer subagent):

- Does the report match the diff? Expected files present, nothing out of scope.
- The project's rules in `CLAUDE.md` (language of user-facing text, UI rules, API conventions,
  no secrets).
- Migrations or schema versions: two forks must not use the same number; tests that pin a
  version must accept a higher one.
- Tests for what changed exist and assert the behaviour, not only a successful status.

Small problems are fixed here after the merge; a wrong design goes back to the fork
(`SendMessage` to its session) before merging.

## 4. Merge into the integration branch

```bash
git merge --no-ff refs/heads/<branch> -m "Merge branch '<branch>' into <integration>"
```

Conflicts: keep both sides (migrations: the higher number; docs and `CLAUDE.md`: the text of
both). When the project uses docs-keeper (a generated docs index in `CLAUDE.md`), run its
`index` and `check`. Then `git commit --no-edit`.

## 5. Full test suite

Start what `checks.full` needs (for example the container engine) and wait for it. Run the suite
in the background with the log in the scratchpad, then read the summary line and the failures. A
fatal error before the summary means the suite did not run: fix and repeat. Run the extra suite
too when `checks.full` says the merge touched what it covers.

## 6. Fix and repeat (only on failures)

1. For each failure, the cause first: wrong test or wrong code?
2. Run only the affected tests until they pass.
3. Run the **full** suite again. Repeat until green. If the same failure survives 3 rounds, stop
   and tell the user what is known.

## 7. Atomic commits

The forks' commits and the merges stay as they are. Fixes made here: **one commit per cause**,
with only that cause's files (`git add <files>`, never `git add -A`), in the project's commit
style (from `CLAUDE.md` or its commit instructions), with the attribution trailer the session
gives. Docs that describe the fix go in the same commit.

## 8. Push

When `git.pushAndPr` is `agent` (with `user`, stop here and say what is ready):

```bash
git push origin <integration>
```

Never `--force`. Rejected because another session pushed: `git pull --no-rebase origin
<integration>`, and back to step 5 if code came in.

## 9. PR to the base branch

Skip when the integration branch is the base branch. Otherwise:

1. `gh pr list --head <integration> --base <base> --state open`. One exists: update its body
   (`gh pr edit`).
2. None: `gh pr create --base <base> --head <integration>` with a short title and a body: what
   each fork brought, migrations (and what they require of other environments), fixes made here,
   the suite result, what was not verified (browser, real hardware). End it with the attribution
   line the session gives.
3. Bind the PR to the session (`get_status`; `bind_pr` if it is not there) and read the CI.
4. **Merge only if the user asked in this invocation**, only with CI green, with
   `git.mergeMethod`; then `git fetch` (without switching branch).

## 10. Clean up forks, worktrees and branches

Only after the push (the branches are on the remote inside the integration branch), and as
`git.deleteMergedBranches` says. Per fork:

1. Delete the fork's session (`delete_session`; if it fails, ask the user to delete it).
2. `git worktree remove <path>` (or `git worktree prune` when the folder is already gone). Never
   `--force` on a worktree with uncommitted files: show them to the user.
3. `git branch -d <branch>` (`git branch -d`, never `-D`: it refuses an unmerged branch).

Research-only sessions (no branch) are deleted too, once their result reached the user.

## 11. Close

- Mocks now implemented (a `mocks.json` from mock-kit): set them to `implementada` with mock-kit's
  `status` command.
- `wrap_up` with the state: what came in, the suite, the PR link, what is left to verify or
  decide.
- A short answer to the user with the PR link and what needs their action (merging the PR,
  deploy, updating other environments after a migration).
