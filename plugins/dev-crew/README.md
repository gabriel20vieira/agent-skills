# dev-crew

A crew of Claude Code subagents that develops, monitors, verifies and documents a coding task,
each model doing what it is good at:

| Level | Agent | Model | Job |
|---|---|---|---|
| 0 | main session (the `dev-crew` skill) | Opus | read docs, pick skills, plan, split into areas, merge, final check and review |
| 1 | `dev-crew:scribe` | Opus | writes every decision and the run log to `docs/*.md`; creates `CLAUDE.md` if missing |
| 1 | `dev-crew:coordinator` | Opus | briefs, reviews each task, commits on the area branch |
| 2 | `dev-crew:developer` | Sonnet | code and tests, fixes until the check passes |
| 3 | `dev-crew:checker` | Haiku | runs checks or locates code, reports facts only |

Before planning, the main session reads `CLAUDE.md`, the README and the project's specs and
decisions, and picks the installed skills that matter; every brief names the skills and docs
its agent must load. Each area works in its own git worktree and branch (`crew/<runId>/<area>`). At the end, the
main session merges them into `crew/<runId>/run`, runs the full check and reviews the diff.
Progress shows up in the chat: the main session reports each coordinator as it finishes, and
each agent's final report is the record of what it did.

Design: `docs/superpowers/specs/2026-10-17-dev-crew-design.md`.

## Install

```bash
claude plugin marketplace add <path-or-git-url-of-this-repo>
claude plugin install dev-crew@gv-agent-skills
```

Then ask for a task that splits into areas ("add CSV export to notes, API and UI, with
tests"); the `dev-crew` skill loads by itself.

## Good to know

- **Limits:** set per model in `crew.limits` of the project's `docs/settings.md` (defaults:
  2 Opus, 4 Sonnet, 6 Haiku at once). Each launcher counts only the agents it launched;
  coordinators get a Sonnet quota in their brief.
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
