# Project settings

How agents work in this repo. Same format as `templates/nuxt-base/docs/settings.md`:

- empty: not decided yet. Ask the user once, with the options listed, then write the answer
  here (and commit it with the current work).
- `ask`: ask the user every time.
- any other value: follow it without asking.

| Setting | Value | Options | What it decides |
| --- | --- | --- | --- |
| `git.baseBranch` | `main` | branch name | Branch that work starts from and PRs target. |
| `git.deleteMergedBranches` | `yes` | `yes`, `no`, `ask` | After a branch is merged (PR or local): delete it locally and on `origin`, and remove its worktree. Never applies to unmerged commits or a worktree with uncommitted files. |
| `git.mergeMethod` | `merge` | `merge`, `squash`, `rebase`, `ask` | How PRs are merged. |
| `git.pushAndPr` | `agent` | `agent`, `user`, `ask` | Who pushes branches and opens PRs. With `user`, agents stop at a local commit. |
| `checks.beforeCommit` | `node --test skills/*/scripts/*.test.mjs plugins/dev-crew/skills/dev-crew/scripts/*.test.mjs`; `npm run check` in `templates/nuxt-base` when the template changed; for a module, the throwaway-project check in `CLAUDE.md` | commands | What must pass before every commit. |
| `docs.language` | `pt-PT` | `en-US`, `pt-PT`, ... | Language of specs, plans and decision docs. Code and comments stay in English. |
| `crew.limits` | | `opus N, sonnet N, haiku N` (suggested `opus 2, sonnet 4, haiku 6`) | dev-crew: agents per model running at once (coordinators, and the Sonnet quota each gets). |

Add a row when a new recurring question comes up, rather than asking it again in every
session.
