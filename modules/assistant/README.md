# Module: assistant

A chat assistant for a project built from `templates/nuxt-base`, with tools that respect
the permission matrix. Off by default.

How it stays safe (spec §15):
- **Reads** go through the app's own REST API with the user's cookie (`ctx.api`), so the
  normal permission checks apply; tools return allow-listed fields only (`pickFields`).
- **Tools offered** to the model are filtered by `can()` and re-checked on every call.
- **Writes** are only `propose_*` tools. They create a card; the user accepts; `claim` is
  atomic (`UPDATE ... WHERE state = 'pending'`, 409 otherwise); the browser runs the normal
  REST call; `settle` re-reads the database through the tool's `verify()`; a system note
  tells the model what happened.
- At most 6 model calls and 120 s per turn; SSE with `X-Accel-Buffering: no`.

Adds:
- `server/db/schema/assistant.ts` — conversations, messages, proposals.
- `server/assistant/` — `provider.ts` (`ChatProvider`), `providers/ollama.ts`,
  `providers/fake.ts` (tests/demos), `defineTool.ts` (`defineAssistantTool`, `pickFields`),
  `registry.ts` (`ASSISTANT_TOOLS`), `loop.ts`, `tools/notes.ts` (reference tools).
- `server/services/assistant.ts`, `server/api/assistant/**` (chat, conversations,
  proposals claim/settle/reject).
- `shared/utils/assistant.ts`, `shared/schemas/assistant.ts`.
- `app/composables/useAssistantChat.ts`, `app/components/AssistantProposalCard.vue`,
  `app/components/AssistantSettings.vue`, `app/pages/assistente.vue`.
- `test/api/assistant.test.ts` (uses the fake provider).
- i18n: `nav.assistant`, `assistant.*`, `settings.tabs.assistant`, `errors.assistant.*`.

Core edits: see `skills/web-assistant/SKILL.md`.
