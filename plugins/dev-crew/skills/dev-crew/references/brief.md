# Briefs

Every agent in the crew gets a closed brief: enough to finish without asking, and nothing
that invites it to wander. The launcher writes it; the agent's last message answers its
`Return` line.

## Format

```
Task: <one sentence>
Worktree: <absolute path>
Files you may touch: <list>
Files you must not touch: all others
Done when: <verifiable criteria>
Check: <exact commands>
Return: <shape of the final report>
Dashboard: <url>, run <runId>, your agent id <agentId>, parent <parentId>
```

Leave the `Dashboard` line out when the run has no dashboard. In the fallback where limits are
shared out by quota, add `Quota: up to <n> <model> at once`.

## Agent ids

The launcher picks the id and creates the row as `queued` before launching.

| Agent | Id | Example |
|---|---|---|
| main session | `main` | `main` |
| coordinator | `coordinator-<area>` | `coordinator-api` |
| developer | `developer-<area>-<n>` (n counted by the coordinator) | `developer-api-2` |
| checker of a developer | `checker-<area>-<n>-<k>` | `checker-api-2-1` |
| checker of a coordinator | `checker-<area>-0-<k>` | `checker-api-0-1` |
| checker of the main session | `checker-main-<k>` | `checker-main-1` |

## Examples

Main session to a coordinator:

```
Task: Area "api" - add CSV export of notes
Worktree: D:/work/notes-app-crew/20261017-1405-notes-export-api
Branch: crew/20261017-1405-notes-export/api
Tasks:
  1. GET /api/notes/export returns the user's notes as CSV
  2. API test for export (empty list, two notes, no permission)
Files you may touch: server/api/notes/**, server/services/notes.ts, tests/api/notes-export.test.ts
Files you must not touch: all others
Done when: both tasks committed on the area branch, check passes
Check: npm run check && npm run test:api
Return: Area, Branch, Tasks (accepted <commit> | unresolved <why>), Files touched, Risks
Dashboard: https://claude.ai/artifact/..., run 20261017-1405-notes-export, your agent id coordinator-api, parent main
```

Coordinator to a developer:

```
Task: GET /api/notes/export returns the user's notes as CSV (id, title, updatedAt)
Worktree: D:/work/notes-app-crew/20261017-1405-notes-export-api
Files you may touch: server/api/notes/export.get.ts, server/services/notes.ts
Files you must not touch: all others
Done when: route returns text/csv with a header row; 403 without notes.read
Check: npm run check
Return: files changed, tests added, last check result (PASS/FAIL + failures)
Dashboard: https://claude.ai/artifact/..., run 20261017-1405-notes-export, your agent id developer-api-1, parent coordinator-api
```

Developer to a checker:

```
Mode: check
Worktree: D:/work/notes-app-crew/20261017-1405-notes-export-api
Check: npm run check
Return: PASS, or FAIL with file:line: message lines
Dashboard: https://claude.ai/artifact/..., run 20261017-1405-notes-export, your agent id checker-api-1-1, parent developer-api-1
```
