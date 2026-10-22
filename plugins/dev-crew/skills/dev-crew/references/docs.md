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

Decisions and docs are written by a `dev-crew:scribe` (Opus by default), launched by the
principal in the background. Never two scribes at once: they share the run worktree. Launch one:

1. **After the plan:** the run doc (goal, areas, skills, docs read), one decision file per
   real decision in the plan (an approach chosen over another, a constraint accepted), and
   `CLAUDE.md` if the project has none.
2. **After each coordinator report:** the decisions it lists and the area's result in the run
   doc. Batch reports that arrive close together into one scribe.
3. **At the end, before cleanup:** the checks, the verdict, open items, and the docs index.

In `code` mode the scribe commits on the run branch, in the run worktree
(`<repo>-crew/<runId>/run`), so the docs merge with the code; wait for the running scribe to
finish before `merge`, because `merge` refuses a dirty run worktree. In `analysis` mode it
works in the repo itself and commits the findings and the report under `docs/analysis/<runId>/`
on the current branch, together with the decisions.

## Project settings: docs/settings.md

Working preferences the user decided once, so nobody asks again: a table with the columns
Setting, Value, Options and What it decides. An empty value means not decided yet: ask the
user once, with the options, and record the answer. `ask` means ask every time. Any other
value is followed without asking. The crew uses:

| Setting | Options | Used in |
| --- | --- | --- |
| `crew.models` | `principal fable|opus, coordinator opus, developer sonnet, checker haiku, scribe opus` | every launch: the model passed to the Agent tool; the principal checks its own against it |
| `crew.limits` | `coordinator N, developer N, checker N` | every launch: agents of a role at once, per launcher |
| `git.deleteMergedBranches` | `yes`, `no`, `ask` | code steps 12 and 14: delete merged branches locally and on `origin` |
| `docs.language` | `en-US`, `pt-PT`, ... | language of the docs the scribe writes, and of findings and reports |
| `git.baseBranch` | branch name | step 1: the run should start from it |
| `checks.beforeCommit` | commands | code step 5: default check commands of each area |

If the file does not exist, the first scribe creates it with these rows (plus any the
project's template already defines) and the answers given. Rows the crew does not use are
kept as they are.

## What counts as a decision

Something a later reader would otherwise have to guess: a choice between approaches, a
library or pattern adopted, a rule or limit accepted, a scope cut, an interface agreed between
areas, a risk accepted. Routine steps (a file renamed, a test added) belong in the run doc, not
in a decision file.

## Layout

When the `docs-keeper` skill is available, follow it: its categories (one folder per
category, one file per topic), its file format (`Updated:` and `Sources:`), and run its
`docs-index.mjs index` after writing so every doc is listed in `CLAUDE.md`. Otherwise follow
the project's existing docs layout when it has one, or this default:

- `docs/decisions/<yyyy-mm-dd>-<slug>.md`: one decision per file (Context, Decision,
  Consequences, Alternatives, `Run: <runId>`).
- `docs/runs/<runId>.md`: the run log.
- `docs/README.md`: the index.
- `CLAUDE.md` at the root, created only when missing.
