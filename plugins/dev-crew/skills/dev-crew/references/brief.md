# Briefs

Every agent in the crew gets a closed brief: enough to finish without asking, and nothing
that invites it to wander. The launcher writes it; the agent's last message answers its
`Return` line, and that report is the only record of what the agent did.

## Format

```
Task: <one sentence>
Worktree: <absolute path>
Files you may touch: <list>
Files you must not touch: all others
Done when: <verifiable criteria>
Check: <exact commands>
Skills: <skills to load with the Skill tool first, or none>
Read first: <doc paths, or none>
Return: <shape of the final report>
```

A coordinator's brief also carries `Branch: <area branch>`, its `Tasks:` and
`Quota: up to <n> sonnet at once` (its share of `crew.limits`, at least 1).

## Limits

Each launcher keeps its own list of the agents it launched and counts only those: the main
session counts coordinators against the Opus limit, each coordinator counts its developers
against its quota, and each developer runs one checker at a time. Nothing is shared between
launchers, so there is nothing to read or lock.

## Examples

Main session to a coordinator:

```
Task: Area "api" - add CSV export of notes
Worktree: D:/work/notes-app-crew/20261017-1405-notes-export/api
Branch: crew/20261017-1405-notes-export/api
Tasks:
  1. GET /api/notes/export returns the user's notes as CSV
  2. API test for export (empty list, two notes, no permission)
Files you may touch: server/api/notes/**, server/services/notes.ts, tests/api/notes-export.test.ts
Files you must not touch: all others
Done when: both tasks committed on the area branch, check passes
Check: npm run check && npm run test:api
Skills: web-foundation, web-crud-resource
Read first: CLAUDE.md, docs/superpowers/specs/2026-09-19-website-foundation-design.md
Quota: up to 2 sonnet at once
Return: Area, Branch, Tasks (accepted <commit> | unresolved <why>), Files touched, Decisions, Risks
```

Coordinator to a developer:

```
Task: GET /api/notes/export returns the user's notes as CSV (id, title, updatedAt)
Worktree: D:/work/notes-app-crew/20261017-1405-notes-export/api
Files you may touch: server/api/notes/export.get.ts, server/services/notes.ts
Files you must not touch: all others
Done when: route returns text/csv with a header row; 403 without notes.read
Check: npm run check
Skills: web-crud-resource
Read first: CLAUDE.md
Return: files changed, tests added, last check result (PASS/FAIL + failures), decisions made
```

Developer to a checker:

```
Mode: check
Worktree: D:/work/notes-app-crew/20261017-1405-notes-export/api
Check: npm run check
Return: PASS, or FAIL with file:line: message lines
```

Main session to a scribe:

```
Task: Record the plan of run 20261017-1405-notes-export
Worktree: D:/work/notes-app-crew/20261017-1405-notes-export/run
Record: goal, areas api and ui, skills (web-foundation, web-crud-resource), docs read;
  decisions: CSV built server-side, not in the browser (keeps permission checks in one place)
CLAUDE.md: missing
Read first: references/docs.md of the dev-crew skill (layout), docs/
Return: files written, commit, CLAUDE.md status
```
