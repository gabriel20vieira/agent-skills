# Plano — Assistente: pensamento, resumos, gráficos, Ollama e Anthropic

> Executado inline. O plano fixa ficheiros, interfaces e verificação; o texto vive nos commits.

**Spec:** `docs/superpowers/specs/2026-10-17-assistant-thinking-design.md`

## Interfaces (shared/utils/assistant.ts)

- `AssistantStreamEvent`: `conversation{id}`, `thinking{text}`, `text{text}`,
  `tool{name, status: "running"|"done"}`, `proposal{proposal}`, `chart{chart}`, `title{id, title}`,
  `error{code}`, `done`.
- `AssistantChart { type, title, categories: string[], series: { name, data: number[] }[], unit? }`.
- `AssistantSegment`: `thinking{text,start,end}`, `text{text}`, `tool{name,start,end,done}`,
  `proposal{id}`, `chart{chart}`.
- `AssistantMessageView { id, role, content, segments?, createdAt }`.
- Funções puras: `appendSegment(segments, event, at)` (aplica um evento ao array) e `groupSegments(segments)`
  (pensamento + tools consecutivos num grupo).

## Tarefas

1. **Puros + testes unitários:** `shared/utils/assistant.ts` (segmentos, grupos, `normalizeChart`),
   `server/assistant/providers/anthropicMessages.ts` (`toAnthropic`), `server/assistant/providers/ollamaStream.ts`
   (`parseOllamaLine`). Testes em `test/unit/assistant*.test.ts`.
2. **Servidor:** providers (thinking, raw, Anthropic, fake), `defineTool` (kind `chart`), loop
   (histórico uma vez por turno, segmentos, gráficos, guardar em `finally`), serviço (coluna
   `segments`, `setSegments`, `setTitle`, vista por turno), título por modelo, `chart.post` com
   `title`, schema (`segments`), settings (`provider` com `anthropic`, `anthropicModel`).
3. **Cliente:** `useAssistantChat` (segmentos), `AssistantThinkingBlock`, `AssistantChartCard`,
   `AssistantMarkdown`, `assistente.vue`, `AssistantSettings` (Anthropic).
4. **i18n, testes de API, README do módulo, skills** `web-assistant` e `web-assistant-tool`.
5. **Verificação** num projeto descartável (`npm run check`, `npm run test:api`).
