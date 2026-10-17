# Module: assistant

A chat assistant for a project built from `templates/nuxt-base`, with tools that respect
the permission matrix. Off by default. Providers: Ollama, Anthropic (Claude), and a fake
one for tests. Design: `docs/superpowers/specs/2026-10-17-assistant-thinking-design.md`
(and spec 2026-09-19 §15).

How it stays safe (spec §15):
- **Reads** go through the app's own REST API with the user's cookie (`ctx.api`), so the
  normal permission checks apply; tools return allow-listed fields only (`pickFields`).
- **Charts** are computed on the server by chart tools; the model never supplies numbers.
- **Tools offered** to the model are filtered by `can()` and re-checked on every call.
- **Writes** are only `propose_*` tools. They create a card; the user accepts; `claim` is
  atomic (`UPDATE ... WHERE state = 'pending'`, 409 otherwise); the browser runs the normal
  REST call; `settle` re-reads the database through the tool's `verify()`; a system note
  tells the model what happened.
- **Keys** live in the server environment (`ANTHROPIC_API_KEY`), never in settings.
- At most 6 model calls and 120 s per turn; SSE with `X-Accel-Buffering: no`.

What the user sees:
- The model's reasoning streams live in a block that folds to "Thought for N s" (Ollama
  `think`, Anthropic adaptive thinking with `display: "summarized"`), with each tool step
  as a chip.
- Answers in Markdown (sanitised), proposal cards and charts in the order they happened.
- Every reply is stored as ordered segments (`assistant_messages.segments`), so a reload
  shows the same reply.
- New conversations get a short title written by the model.

The loop loads the transcript once per turn and only appends to it: Anthropic thinking
blocks are replayed only inside the request that produced them, with the exact history
they were made from.

Adds:
- `server/db/schema/assistant.ts`: conversations, messages (with `segments`), proposals.
- `server/assistant/`:
  - `provider.ts` (`ChatProvider`: `chat` streams thinking/text/tool calls, `complete` for titles)
  - `providers/ollama.ts` + `ollamaStream.ts`, `providers/anthropic.ts` + `anthropicMessages.ts`, `providers/fake.ts`
  - `defineTool.ts` (`defineAssistantTool` with kinds `read`, `chart`, `propose`; `pickFields`)
  - `registry.ts` (`ASSISTANT_TOOLS`)
  - `loop.ts`, `title.ts`
  - `tools/notes.ts` (reference tools: `list_notes`, `chart_notes_by_month`, `propose_note`)
- `server/services/assistant.ts`, `server/api/assistant/**` (chat, conversations,
  proposals claim/settle/reject).
- `shared/utils/assistant.ts` (events, segments, `applyEvent`, `groupSegments`,
  `normalizeChart`), `shared/schemas/assistant.ts`.
- `app/composables/useAssistantChat.ts`.
- `app/components/`: `AssistantThinkingBlock.vue`, `AssistantMarkdown.vue`,
  `AssistantChartCard.vue`, `AssistantProposalCard.vue`, `AssistantSettings.vue`.
- `app/pages/assistente.vue`.
- `test/api/assistant.test.ts` (fake provider), `test/unit/assistantSegments.test.ts`,
  `test/unit/assistantProviders.test.ts`.
- i18n: `nav.assistant`, `assistant.*`, `settings.tabs.assistant`, `errors.assistant.*`.
- Dependencies: `@anthropic-ai/sdk`, `marked`, `dompurify`.

Core edits: see `skills/web-assistant/SKILL.md`.
