---
name: web-assistant
description: Use when a project built from the web-foundation Nuxt template should get an AI chat assistant (Ollama or another LLM) that answers from the app's data and proposes changes the user must accept - installs the assistant module with permission-aware tools, streaming chat and proposal cards.
---

# Assistant module

Installs `modules/assistant`. Read its README for the safety model before changing
anything: reads go through the REST API as the user, writes are only proposals the user
accepts, and the server verifies the result.

## Install

1. Copy the files and merge the texts:

   ```bash
   node "${CLAUDE_PLUGIN_ROOT}/skills/web-foundation/scripts/apply-module.mjs" assistant .
   ```

2. `server/db/schema/index.ts`: `export * from "./assistant"`.
3. `shared/utils/permissions.ts`: add `"assistant"` to `RESOURCES`; in `PERMISSIONS`
   `admin: { ..., assistant: ALL }` and `assistant: ["read"]` for each role that may use
   it (default: `editor`, `user`).
4. `shared/utils/settings.ts`, inside `SETTINGS`:

   ```ts
   "assistant.enabled": define(z.boolean(), false, true),
   "assistant.provider": define(z.enum(["ollama", "fake"]), "ollama"),
   "assistant.baseUrl": define(z.url().max(500), "http://localhost:11434"),
   "assistant.model": define(z.string().trim().min(1).max(100), "llama3.1"),
   "assistant.systemPrompt": define(z.string().max(4000), ""),
   ```

5. `app/utils/navigation.ts`, main group:
   `{ to: "/assistente", labelKey: "nav.assistant", icon: BotIcon, permission: ["assistant", "read"] }`.
6. `app/pages/admin/definicoes.vue`: a tab
   `<TabsTrigger value="assistant">{{ t("settings.tabs.assistant") }}</TabsTrigger>` and
   `<TabsContent value="assistant"><AssistantSettings /></TabsContent>`.
7. Migration: `npm run db:generate -- --name assistant`, read the SQL, `npm run db:migrate`.
8. The reference tools use the `notes` example. If the project removed notes, delete
   `server/assistant/tools/notes.ts` and its entries in `registry.ts`, and write the
   project's own tools with `web-assistant-tool`. Also rewrite `test/api/assistant.test.ts`
   around them (the fake provider calls `list_notes`/`propose_note` by name; change its
   commands to your tool names).

## Running a model

- Ollama on the same machine: `ollama pull llama3.1` (any model with tool calling), then
  in `/admin/definicoes` → Assistente: provider Ollama, address `http://localhost:11434`,
  model, and turn it on.
- App in Docker, Ollama on the host: address `http://host.docker.internal:11434` and add
  `extra_hosts: ["host.docker.internal:host-gateway"]` to the `app` service.
- Another provider (OpenAI-compatible, Anthropic, ...): add
  `server/assistant/providers/<name>.ts` implementing `ChatProvider` (stream text chunks,
  emit `tool_calls` with parsed arguments), add the name to the `assistant.provider` enum
  and to `getChatProvider`, and put its API key in `runtimeConfig` (env), never in settings.
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

Browser (provider "fake" is enough): enable it, open `/assistente`, send
"propose note: Hello", accept the card, check the note exists and the card says Done;
a second tab accepting the same card gets "already handled".
