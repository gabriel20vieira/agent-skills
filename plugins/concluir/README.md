# concluir

Closes the cycle of the parallel sessions (forks) started from a coordinator session in Claude
Code. Forks write code and tests in their own worktrees and branches; `concluir` brings it home:

1. Collects the finished forks (branches, commits, reports) and their overlaps.
2. Takes stock with the user: each request of the conversation and of each fork as done,
   partial, not done or undecided, and waits for their answer.
3. Reviews each branch against its report and the project's rules in `CLAUDE.md`.
4. Merges with `--no-ff` into the integration branch, runs the full suite in the background and
   fixes until it is green.
5. One commit per fix, push, opens or updates the PR to the base branch.
6. Cleans up the fork sessions, worktrees and merged branches.

Safe in a folder shared with other sessions: never `stash`, `reset`, `checkout` or `clean`,
never `--force`, no secrets in logs or commits, and the PR merge is the user's unless they ask
for it (`/concluir:concluir merge`).

```bash
claude plugin marketplace add gabriel20vieira/agent-skills
```

```bash
claude plugin install concluir@gv-agent-skills
```

Project values (integration branch, base branch, full test suite) come from the project's
`docs/settings.md`; when one is missing the skill asks once and records it there. See
`skills/concluir/references/settings.md`.

## License

MIT. See [LICENSE](LICENSE).
