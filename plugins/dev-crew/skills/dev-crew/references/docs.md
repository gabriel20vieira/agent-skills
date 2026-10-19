# Context and docs

Two things keep a crew from working blind: reading what the project already knows before
planning, and writing down what the run decides so the next person (or model) knows it too.

## Before planning: what to read and which skills to use

Read, in this order, and stop when you have enough to plan:

1. `CLAUDE.md` (root and nested), then `README.md`.
2. Specs, designs and plans: `docs/` (for example `docs/superpowers/specs/`,
   `docs/superpowers/plans/`, `docs/decisions/`, `docs/runs/`, `docs/adr/`). Specs and earlier
   decisions are the most important input: they say what was already decided.
3. The project's own commands: `package.json` scripts (or the equivalent for the stack).
4. `docs/settings.md`: the project settings (see below).

Then pick the skills that matter for this task from the skills and plugins available in this
session (they are listed in your context). Choose by what the task touches, not by name
alone. For example:

- A project built from the web-foundation template (it has `shared/utils/permissions.ts`,
  `server/services` and a `/_ws` hub): `web-foundation` for the rules, plus the specific
  `web-*` skill for the change (`web-crud-resource`, `web-realtime-event`, `web-theme`, ...).
- Process skills the user has installed (test-driven development, debugging, verification)
  apply to developers and coordinators on every task.
- Skills for other stacks or other kinds of work stay out.

Write the choice into the plan and the run doc: `Skills:` (names) and `Read first:` (doc
paths). Every brief carries those two lines, cut down to what that agent needs. Agents load
each listed skill with the Skill tool before they start.

## During the run: the scribe

Decisions and docs are written by a `dev-crew:scribe` (Opus), launched by the main session in
the background. Never two scribes at once: they share the run worktree. Launch one:

1. **After the plan:** the run doc (goal, areas, skills, docs read), one decision file per
   real decision in the plan (an approach chosen over another, a constraint accepted), and
   `CLAUDE.md` if the project has none.
2. **After each coordinator report:** the decisions it lists and the area's result in the run
   doc. Batch reports that arrive close together into one scribe.
3. **At the end, before cleanup:** the checks, the verdict, open items, and the docs index.

The scribe commits on the run branch, in the run worktree (`<repo>-crew/<runId>/run`), so the
docs merge with the code. Wait for the running scribe to finish before `merge`, because
`merge` refuses a dirty run worktree.

## Project settings: docs/settings.md

Working preferences the user decided once, so nobody asks again: a table with the columns
Setting, Value, Options and What it decides. An empty value means not decided yet: ask the
user once, with the options, and record the answer. `ask` means ask every time. Any other
value is followed without asking. The crew uses:

| Setting | Options | Used in |
| --- | --- | --- |
| `git.deleteMergedBranches` | `yes`, `no`, `ask` | steps 13 and 15: delete merged branches locally and on `origin` |
| `docs.language` | `en-US`, `pt-PT`, ... | language of the docs the scribe writes |
| `git.baseBranch` | branch name | step 1: the run should start from it |
| `checks.beforeCommit` | commands | step 3: default check commands of each area |
| `crew.limits` | `opus N, sonnet N, haiku N` | step 6: coordinators at once and their Sonnet quotas |

If the file does not exist, the first scribe creates it with these rows (plus any the
project's template already defines) and the answers given. Rows the crew does not use are
kept as they are.

## What counts as a decision

Something a later reader would otherwise have to guess: a choice between approaches, a
library or pattern adopted, a rule or limit accepted, a scope cut, an interface agreed between
areas, a risk accepted. Routine steps (a file renamed, a test added) belong in the run doc, not
in a decision file.

## Layout

Follow the project's existing docs layout when it has one. Otherwise the scribe uses:

- `docs/decisions/<yyyy-mm-dd>-<slug>.md`: one decision per file (Context, Decision,
  Consequences, Alternatives, `Run: <runId>`).
- `docs/runs/<runId>.md`: the run log.
- `docs/README.md`: the index.
- `CLAUDE.md` at the root, created only when missing.
