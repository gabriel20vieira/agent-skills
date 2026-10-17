---
name: web-assistant
description: Use when a project built from the web-foundation Nuxt template should get an AI chat assistant (Ollama or Anthropic Claude) that answers from the app's data, shows its reasoning live, draws charts and proposes changes the user must accept - installs the assistant module with permission-aware tools, streaming chat, proposal cards and charts.
---

# Assistant module

Installs `modules/assistant`. Read its README for the safety model before changing
anything: reads go through the REST API as the user, writes are only proposals the user
accepts, and the server verifies the result.

## Install

1. Copy the files and merge the texts, then add the dependencies (Anthropic SDK, and
   Markdown rendering with sanitising):

   ```bash
   node "${CLAUDE_PLUGIN_ROOT}/skills/web-foundation/scripts/apply-module.mjs" assistant .
   npm install @anthropic-ai/sdk@^0.135.0 marked@^18.1.1 dompurify@^3.4.17
   ```

2. `server/db/schema/index.ts`: `export * from "./assistant"`.
3. `shared/utils/permissions.ts`: add `"assistant"` to `RESOURCES`; in `PERMISSIONS`
   `admin: { ..., assistant: ALL }` and `assistant: ["read"]` for each role that may use
   it (default: `editor`, `user`).
4. `shared/utils/settings.ts`, inside `SETTINGS`:

   ```ts
   "assistant.enabled": define(z.boolean(), false, true),
   "assistant.provider": define(z.enum(["ollama", "anthropic", "fake"]), "ollama"),
   "assistant.baseUrl": define(z.url().max(500), "http://localhost:11434"),
   "assistant.model": define(z.string().trim().min(1).max(100), "llama3.1"),
   "assistant.anthropicModel": define(z.string().trim().min(1).max(100), "claude-opus-5-5"),
   "assistant.systemPrompt": define(z.string().max(4000), ""),
   ```

5. `app/utils/navigation.ts`, main group:
   `{ to: "/assistente", labelKey: "nav.assistant", icon: BotIcon, permission: ["assistant", "read"] }`.
6. `app/pages/admin/definicoes.vue`: a tab (written as the linter wants it):

   ```vue
   <TabsTrigger value="assistant">
       {{ t("settings.tabs.assistant") }}
   </TabsTrigger>
   ```

   ```vue
   <TabsContent value="assistant">
       <AssistantSettings />
   </TabsContent>
   ```
7. Migration: `npm run db:generate -- --name assistant`, read the SQL, `npm run db:migrate`.
8. `.env.example` (and the deployment's secrets): `ANTHROPIC_API_KEY=` with an empty value,
   when the project will use Anthropic. With Docker Compose, pass it to the `app` service.
9. The reference tools use the `notes` example. If the project removed notes, delete
   `server/assistant/tools/notes.ts` and its entries in `registry.ts`, and write the
   project's own tools with `web-assistant-tool`. Also rewrite `test/api/assistant.test.ts`
   around them (the fake provider calls `list_notes`/`propose_note` by name; change its
   commands to your tool names). Replace the `assistant.suggestions.*` texts with questions
   that fit the project.

## Running a model

- Ollama on the same machine: `ollama pull llama3.1` (any model with tool calling; a
  reasoning model such as `qwen3` or `gpt-oss` also shows its thinking), then in
  `/admin/definicoes` → Assistente: provider Ollama, address `http://localhost:11434`,
  model, and turn it on. Models without reasoning are detected and called without it.
- Anthropic: set `ANTHROPIC_API_KEY` in the server's environment (never in the settings),
  then pick provider Anthropic and the model (default `claude-opus-5-5`; `claude-sonnet-5-5`
  or `claude-haiku-5-5` cost less). The reasoning shown is the summary the API streams
  (adaptive thinking, `display: "summarized"`). Refusals fall back server-side
  (`fallbacks: "default"`) and otherwise show `errors.assistant.refused`.
- App in Docker, Ollama on the host: address `http://host.docker.internal:11434` and add
  `extra_hosts: ["host.docker.internal:host-gateway"]` to the `app` service.
- Another provider (OpenAI-compatible, ...): add `server/assistant/providers/<name>.ts`
  implementing `ChatProvider` (`chat` streams `thinking`, `text` and `tool_calls` chunks;
  `complete` answers once, for titles), add the name to the `assistant.provider` enum and to
  `getChatProvider`, and read its API key from the environment, never from settings.
- The loop loads the transcript once per turn and only appends to it, so provider blocks
  that are bound to the exact history (Anthropic thinking) stay valid. Keep it that way:
  never rebuild or trim the history in the middle of a turn.
- Behind nginx, streaming needs `proxy_buffering off` (the template's `deploy/nginx.conf`
  has it); Caddy needs `flush_interval -1` (also there).

## Rules

- Never give the assistant a tool that writes directly or queries the database.
- Tool results: only the fields the answer needs; leave out emails, phone numbers,
  addresses and free text about people unless the tool exists for that.
- `assistant.enabled` stays `false` in the template default; turning it on is an admin
  decision per deployment.
- Conversations are private to their owner (404 for anyone else, admins included).

## Verify

```bash
npm run check
npm run test:api
```

Browser (provider "fake" is enough): enable it, open `/assistente`, send "chart notes"
(a reasoning block that folds to "Thought for N s", then a chart), reload and reopen the
conversation (same reply, same order), send "propose note: Hello", accept the card, check
the note exists and the card says Done; a second tab accepting the same card gets
"already handled".
