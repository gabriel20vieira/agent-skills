# docs-keeper

Keeps a project's documentation in `docs/`, one folder per category and one file per topic,
and every file listed in `CLAUDE.md` so the next session finds it.

- **Detects** the categories the project has (architecture, UI and theming, data, API, auth,
  realtime, i18n, testing, operations, integrations, features, decisions, guides) from its
  code and config, and creates the missing folders and files.
- **Updates** the docs as the code changes: each doc lists its `Sources:`, and
  `docs-index.mjs stale` names the docs whose sources changed after their `Updated:` date.
- **Indexes** every doc in `CLAUDE.md`, between `<!-- docs-index:start -->` and
  `<!-- docs-index:end -->`, with its one-line summary. `docs-index.mjs check` fails when the
  index is out of date.

```bash
claude plugin install docs-keeper@gv-agent-skills
```

The skill loads by itself when Claude changes code the docs describe or finishes a task. Ask
"document this project" to start a project with no `docs/`.

Script, from the project root:

```bash
node <plugin>/skills/docs-keeper/scripts/docs-index.mjs index   # write the index into CLAUDE.md
node <plugin>/skills/docs-keeper/scripts/docs-index.mjs check   # exit 1 if it is out of date
node <plugin>/skills/docs-keeper/scripts/docs-index.mjs stale   # docs whose sources changed
```

Docs are written in `docs.language` from `docs/settings.md` when the project has one. The
dev-crew scribe follows this plugin's layout when both are installed.

Design: `docs/superpowers/specs/2026-10-22-docs-keeper-design.md`.
