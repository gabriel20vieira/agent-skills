# dev-crew

A crew of Claude Code subagents for two kinds of work: big coding tasks (a feature across
several areas, a plan with independent tasks) and large analyses (reading and auditing a big
codebase or body of documentation). Four roles, each on the model suited to it:

| Role | Agent | Default model | Function |
|---|---|---|---|
| principal | your session (the `dev-crew` skill) | Fable or Opus | understand, decompose, decide what runs in parallel, merge, review, verdict |
| coordinator | `dev-crew:coordinator` | Opus | takes one task that must be distributed, splits it among developers, reviews what comes back |
| developer | `dev-crew:developer` | Sonnet | one concrete task: code with tests, or one slice of a corpus read and reported with citations |
| checker | `dev-crew:checker` | Haiku | reads, verifies, correlates: runs checks, locates code, confirms claims against sources |
| scribe | `dev-crew:scribe` | Opus | writes every decision and the run log to `docs/*.md`; creates `CLAUDE.md` if missing |

The roles are functions, not a hierarchy: whoever needs one launches it. The principal
sends a task that splits to a coordinator, a single task straight to a developer, a
verification straight to a checker. Models are set per role in `crew.models` of the
project's `docs/settings.md` and passed at launch; the principal is whatever model the
session runs on (`/model`).

The principal picks the mode from the task. In **`code`** mode each area works in its own git
worktree and branch (`crew/<runId>/<area>`); at the end the principal merges them into
`crew/<runId>/run`, runs the full check and reviews the diff. In **`analysis`** mode there is
no git: the corpus is split into slices, each slice is read and reported with citations,
every claim is verified against its source by a checker, and the principal writes one report
under `docs/analysis/<runId>/`. Progress shows up in the chat, and each agent's final report
is the record of what it did.

Design: `docs/superpowers/specs/2026-10-17-dev-crew-design.md`.

## Install

```bash
claude plugin marketplace add <path-or-git-url-of-this-repo>
claude plugin install dev-crew@gv-agent-skills
```

Then ask for a task that splits ("add CSV export to notes, API and UI, with tests", or
"audit how every server handler checks permissions"); the `dev-crew` skill loads by itself.

## Good to know

- **Models and limits:** `crew.models` and `crew.limits` in the project's `docs/settings.md`
  (defaults: coordinator Opus, developer Sonnet, checker Haiku; 2, 4 and 6 at once). Each
  launcher counts only the agents it launched; coordinators get a developer quota in their
  brief.
  Claude Code caps concurrent subagents at 20 (`CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS`), and
  nesting at 3 levels (`CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH`), which the crew needs.
- **Never:** push code, open PRs or merge into your branch. A run ends on
  `crew/<runId>/run` for you to review.
- **Cleans up:** every worktree when the run ends. Merged branches (area branches, and the run
  branch locally and on `origin` with `worktrees.mjs finish <runId>` after you merge it) are
  deleted according to `git.deleteMergedBranches` in the project's `docs/settings.md`; the
  crew asks once when it is not set and records your answer there.

## Layout

- `skills/dev-crew/`: the skill, its references (`brief.md`, `docs.md`) and `scripts/worktrees.mjs` (start, merge, clean up and finish a run).
- `agents/`: the four crew agents, with the model and effort pinned in the frontmatter.

Tests: `node --test plugins/dev-crew/skills/*/scripts/*.test.mjs`.
