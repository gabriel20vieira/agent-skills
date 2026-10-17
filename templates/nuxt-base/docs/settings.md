# Project settings

How agents (Claude, the web-* skills, dev-crew) work in this project. These are working
preferences, not app configuration: runtime settings of the app live in
`shared/utils/settings.ts`.

Read this file before acting on anything in the table. Values:

- empty: not decided yet. Ask the user once, with the options listed, then write the answer
  here (and commit it with the current work). A row whose options say what empty means
  follows that instead of asking.
- `ask`: ask the user every time.
- any other value: follow it without asking.

| Setting | Value | Options | What it decides |
| --- | --- | --- | --- |
| `git.baseBranch` | | branch name (`main`, `develop`, ...) | Branch that work starts from and PRs target. |
| `git.deleteMergedBranches` | | `yes`, `no`, `ask` | After a branch is merged (PR or local): delete it locally and on `origin`, and remove its worktree. Never applies to unmerged commits or a worktree with uncommitted files. |
| `git.mergeMethod` | | `merge`, `squash`, `rebase`, `ask` | How PRs are merged. |
| `git.pushAndPr` | | `agent`, `user`, `ask` | Who pushes branches and opens PRs. With `user`, agents stop at a local commit. |
| `checks.beforeCommit` | `npm run check`; `npm run test:api` when server code changed | commands | What must pass before every commit (and what dev-crew checkers run by default). |
| `docs.language` | | `en-US`, `pt-PT`, ... | Language of specs, plans and decision docs. Code and comments stay in English. |
| `modules.installed` | `none` | module names; kept up to date by `apply-module.mjs` | Modules applied to this project, so skills know what exists. |
| `crew.limits` | | `opus N, sonnet N, haiku N` (suggested `opus 2, sonnet 4, haiku 6`) | dev-crew: agents per model running at once. Written to the dashboard at the start of each run; edits on the page last for that run. |
| `crew.dashboardUrl` | | a claude.ai artifact URL; empty = each person's own dashboard, kept in `.claude/dev-crew.local.json` | dev-crew: one dashboard shared by everyone on the project. |

Add a row when a new recurring question comes up, rather than asking it again in every
session.
