---
name: docs-keeper
description: Use whenever you change code, config or behaviour that the project's documentation describes, when you finish a task that changed code, when a project has no docs/ yet, or when asked to document something - keeps docs/ as one folder per category (architecture, ui, data, api, auth, operations, ...) and one file per topic, detects and creates what is missing, updates what changed, and keeps every doc listed in CLAUDE.md.
---

# Docs keeper

The project's documentation lives in `docs/`: one folder per category, one file per topic,
and every file listed in `CLAUDE.md` so the next session finds it. You keep it that way as you
work, without being asked. The index in `CLAUDE.md` is written by a script, never by hand:

```
DOCS="${CLAUDE_PLUGIN_ROOT}/skills/docs-keeper/scripts/docs-index.mjs"
```

- `node "$DOCS" index` writes the index block into `CLAUDE.md` (creates the file if missing).
- `node "$DOCS" check` exits 1 when the index is out of date, and names what is missing.
- `node "$DOCS" stale` lists docs whose `Sources:` changed after their `Updated:` date.

Categories and their signals are in `references/categories.md`. The file format is in
`references/format.md`.

## When there is no docs/ yet (or it is thin)

1. **Detect.** Read the project: `CLAUDE.md`, README, the manifest (`package.json`,
   `pyproject.toml`, ...), the folder layout, and what `docs/` already has. For each category
   in `references/categories.md`, check its signals. Keep only the categories the project
   really has.
2. **Propose.** Tell the user in a few lines which categories and topic files you will create.
   Then create them; do not wait for an answer unless the user asked to review first.
3. **Write.** One file per topic, in the format of `references/format.md`, from what the code
   actually does. Cite paths. Do not invent behaviour you cannot see; write `To confirm:` for
   what you could not verify.
4. **Index.** `node "$DOCS" index`, then `node "$DOCS" check`.

Folders that already exist in `docs/` (for example `superpowers/`, `adr/`) are categories of
the project: keep them as they are and do not move their files.

## While you work

- **Before changing code**, read the docs of the categories it touches (the index in
  `CLAUDE.md` says where they are).
- **After changing code**, update every doc that describes what you changed: the text, the
  `Updated:` date and the `Sources:` list. A new topic gets a new file in its category; a new
  category gets a new folder. `node "$DOCS" stale` lists docs whose sources changed since they
  were last updated: go through them before you finish.
- **A real decision** (an approach chosen over another, a library adopted, a rule accepted)
  gets its own file in `docs/decisions/`.
- **Before committing**, run `node "$DOCS" index` and `node "$DOCS" check`, and commit the docs
  with the code they describe.

## Rules

- Write in the language set by `docs.language` in `docs/settings.md` when it exists (English
  otherwise). Code, paths and identifiers stay as they are.
- Never delete or move a doc without asking the user. When a topic is gone from the code,
  mark the doc `Status: obsolete` at the top and ask.
- Never edit the index block in `CLAUDE.md` by hand; change the docs and run `index`.
- Keep docs short and factual: what it is, where it lives, how it works, how to change it.
  Link to code by path instead of copying it.
- Do not duplicate: one topic, one file. Link between docs instead of repeating.
