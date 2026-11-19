# Settings concluir reads

From the project's `docs/settings.md` (the table agents read: empty = ask once and record,
`ask` = ask every time, anything else = follow it). Add a missing row with an empty value, then
ask the user once and write the answer.

| Setting | Value | Options | What it decides |
| --- | --- | --- | --- |
| `git.integrationBranch` | | branch name (for example `development`), or the same as `git.baseBranch` | Where forks are merged and the full suite runs before the PR. |
| `git.baseBranch` | | branch name (for example `main`) | The branch the PR targets. Only changes through a PR. |
| `checks.full` | | commands, with what must be running first and any extra suite with when it applies | The full test suite run after merging, until it passes. Example: `docker compose run --rm app <test command>` (container engine running); extra: `<other command>` when the merge touches locks or concurrency. |
| `git.mergeMethod` | | `merge`, `squash`, `rebase`, `ask` | How the PR is merged when the user asks for it. |
| `git.pushAndPr` | | `agent`, `user`, `ask` | Who pushes and opens the PR. With `user`, stop at local commits. |
| `git.deleteMergedBranches` | | `yes`, `no`, `ask` | Whether merged fork branches and worktrees are deleted after the push. |

From the project's `CLAUDE.md`:

- the rules the review checks (language of user-facing text, UI rules, API conventions);
- the commit message style (or the file it points to);
- the secrets that must never appear in logs, chat, commands or commits;
- whether the project uses docs-keeper (a generated docs index) or mock-kit (`mocks.json`).
