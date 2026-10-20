# Briefs

Every agent in the crew gets a closed brief: enough to finish without asking, and nothing
that invites it to wander. The launcher writes it; the agent's last message answers its
`Return` line, and that report is the only record of what the agent did.

## Format

```
Task: <one sentence>
Mode: code | analysis
Model: <the model this agent runs on, from crew.models; also passed as the Agent tool's model>
Checker model: <model for the checkers this agent may launch>
Worktree: <absolute path>                      (code)
Branch: <area branch>                          (code, coordinator only)
Files you may touch: <list>                    (code)
Files you must not touch: all others           (code)
Inputs: <what to read: paths, globs, documents, URLs>   (analysis)
Output: <findings file>                        (analysis)
Questions: <what the findings must answer>     (analysis)
Done when: <verifiable criteria>
Check: <exact commands>                        (code)
Skills: <skills to load with the Skill tool first, or none>
Read first: <doc paths, or none>
Quota: up to <n> developer at once             (coordinator only)
Return: <shape of the final report>
```

Lines marked with a mode appear only in that mode. A checker's brief is shorter: `Mode:`
(`check`, `locate` or `verify`), `Worktree:` or the files, `Check:` or the question or the
findings files and their inputs, and `Return:`.

## Models and limits

Models come from `crew.models` in the project's `docs/settings.md`; the launcher writes the
role's model in the brief and passes it as the Agent tool's `model`, so the agent file's
default is only a fallback. Limits come from `crew.limits`. Each launcher keeps its own list
of the agents it launched and counts only those: the principal counts coordinators and
developers it launched against their limits, each coordinator counts its developers against
its quota, and each developer runs one checker at a time. Nothing is shared between
launchers, so there is nothing to read or lock.

## Examples

Principal to a coordinator (`code`):

```
Task: Area "api" - add CSV export of notes
Mode: code
Model: opus
Checker model: haiku
Worktree: D:/work/notes-app-crew/20261017-1405-notes-export/api
Branch: crew/20261017-1405-notes-export/api
Pieces:
  1. GET /api/notes/export returns the user's notes as CSV
  2. API test for export (empty list, two notes, no permission)
Files you may touch: server/api/notes/**, server/services/notes.ts, tests/api/notes-export.test.ts
Files you must not touch: all others
Done when: both pieces committed on the area branch, check passes
Check: npm run check && npm run test:api
Skills: web-foundation, web-crud-resource
Read first: CLAUDE.md, docs/superpowers/specs/2026-09-19-website-foundation-design.md
Quota: up to 2 developer at once
Return: Task, Mode, Branch, Pieces (accepted <commit> | unresolved <why>), Files touched, Decisions, Risks
```

Coordinator to a developer (`code`):

```
Task: GET /api/notes/export returns the user's notes as CSV (id, title, updatedAt)
Mode: code
Model: sonnet
Checker model: haiku
Worktree: D:/work/notes-app-crew/20261017-1405-notes-export/api
Files you may touch: server/api/notes/export.get.ts, server/services/notes.ts
Files you must not touch: all others
Done when: route returns text/csv with a header row; 403 without notes.read
Check: npm run check
Skills: web-crud-resource
Read first: CLAUDE.md
Return: files changed, tests added, last check result (PASS/FAIL + failures), rounds, decisions
```

Principal to a developer (`analysis`, one slice, no coordinator needed):

```
Task: How does the server enforce permissions on write handlers?
Mode: analysis
Model: sonnet
Inputs: server/api/**, server/utils/permissions.ts, shared/utils/permissions.ts
Output: docs/analysis/20261020-0930-perm-audit/server-api.md
Questions: which handlers write; which call assertPermission and with what; which do not
Done when: every write handler under server/api is listed with a path:line citation
Skills: web-foundation
Read first: CLAUDE.md
Return: output, inputs read, claims count and unsupported count, decisions, notes
```

Developer to a checker (`check`):

```
Mode: check
Model: haiku
Worktree: D:/work/notes-app-crew/20261017-1405-notes-export/api
Check: npm run check
Return: PASS, or FAIL with file:line: message lines
```

Principal to a checker (`verify`):

```
Mode: verify
Model: haiku
Findings: docs/analysis/20261020-0930-perm-audit/server-api.md, docs/analysis/20261020-0930-perm-audit/shared.md
Inputs: server/api/**, server/utils/permissions.ts, shared/utils/permissions.ts
Return: one line per claim (confirmed | wrong | unsupported), then Contradictions and Gaps
```

Principal to a scribe:

```
Task: Record the plan of run 20261017-1405-notes-export
Model: opus
Worktree: D:/work/notes-app-crew/20261017-1405-notes-export/run
Record: goal, mode code, areas api and ui, skills (web-foundation, web-crud-resource), docs read;
  decisions: CSV built server-side, not in the browser (keeps permission checks in one place)
CLAUDE.md: missing
Read first: references/docs.md of the dev-crew skill (layout), docs/
Return: files written, commit, CLAUDE.md status
```
