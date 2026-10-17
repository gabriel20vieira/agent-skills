# Dashboard

One claude.ai Artifact page per project shows the crew live: agents running per model
against their limits, and the crew tree with each agent's status, fix rounds, last check and
verdict. The page lives in the plugin (`dashboard/index.html` and `dashboard/logic.js`) and is
published as it is. Never edit or regenerate its HTML in a project.

The dashboard is optional. Without the `Artifact` and `ArtifactData` tools (API key, CI, other
hosts), the crew runs without it. Leave the `Dashboard` line out of the briefs and show a final
table of agents in the chat.

## Open or reuse

The project keeps `{ "url": "...", "version": "<plugin version>" }` in
`.claude/dev-crew.local.json`. Make sure `.claude/dev-crew.local.json` is in the project's
`.gitignore`.

- **No file:** publish (below), then write the file.
- **File present, same version as `${CLAUDE_PLUGIN_ROOT}/.claude-plugin/plugin.json`:** reuse
  the URL.
- **Older version:** read the artifact (`Artifact` action `read` with the `url`), then publish
  again with that `url` so the link stays the same, and update `version`.

To publish, copy `${CLAUDE_PLUGIN_ROOT}/dashboard/index.html` and `logic.js` into your
scratchpad directory (the Artifact tool only publishes from the working directory or the
scratchpad). Then call `Artifact` with:

- `file_path`: the scratchpad `index.html`
- `files`: `{ "logic.js": "<scratchpad>/logic.js" }`
- `capabilities`: `{ "db": {}, "user": {} }`
- `icon`: `"chart"` (first publish only)
- `description`: "Live board for this project's dev-crew runs."

Give the user the link once, and tell them it is private to their account.

## Data

All writes go through the `ArtifactData` tool with the dashboard `url`. Load it with
ToolSearch `select:ArtifactData` if it is not loaded. Writes to an existing document need
`if_version`: keep the `version` each write returns and pass it on the next write. If a pinned
write is refused because the document changed, read it and redo the write.

| Collection | Document | Fields |
|---|---|---|
| `config` | `limits` | `opus`, `sonnet`, `haiku`: max agents running at once (defaults 2, 4, 6). Edited on the page. |
| `runs` | `<runId>` | `title`, `status` (`running`, `accepted`, `rejected`, `stopped`), `startedAt`, `endedAt`, `verdict` |
| `runs/<runId>/agents` | `<agentId>` | `parentId`, `model` (`opus`, `sonnet`, `haiku`), `role` (`main`, `coordinator`, `developer`, `checker`), `area`, `task`, `status`, `loops`, `lastCheck: { ok, failures: [{ file, line, message }] }`, `verdict`, `summary`, `tokens`, `startedAt`, `updatedAt` |

Agent statuses: `queued`, `running`, `fixing`, `passed`, `failed`, `accepted`, `rejected`,
`done`. Dates are ISO strings. An active row (`running` or `fixing`) whose `updatedAt` is older
than 10 minutes shows as "no signal" and does not count against the limits.

Examples:

```
ArtifactData get    collection "config"                   doc_id "limits"
ArtifactData set    collection "runs"                     doc_id "<runId>"   data { title, status: "running", startedAt }
ArtifactData set    collection "runs/<runId>/agents"      doc_id "coordinator-api"
                    data { parentId: "main", model: "opus", role: "coordinator", area: "api", task, status: "queued", startedAt, updatedAt }
ArtifactData update collection "runs/<runId>/agents"      doc_id "coordinator-api" if_version 1
                    data { status: "done", summary, tokens: 182000, updatedAt }
ArtifactData list   collection "runs/<runId>/agents"
```

## Limits

Before launching an agent, read `config/limits` (missing means the defaults) and count the
rows of the current run with that model and an active status that are not "no signal". At the
limit, wait for one of your own agents to finish. Two launchers can overshoot by one at the
same moment; that is accepted.

## Stale rows

At the start and end of each run, list `runs` and, for every run still `running` that is not
the current one, set its active agent rows to `failed` with the summary "closed: no report"
and the run to `stopped`. Batch these writes in one `ArtifactData` `batch`.

## Permissions

`ArtifactData` writes may ask for approval, depending on the user's permission mode. Agents in
the background can stall on a prompt nobody sees. If the user wants the crew to run unattended,
suggest allowing `ArtifactData` in their Claude Code settings (`permissions.allow`). Do not
change the settings yourself.
