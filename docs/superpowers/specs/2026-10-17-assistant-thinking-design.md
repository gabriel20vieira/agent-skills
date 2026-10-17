# Assistente: pensamento visível, resumos, gráficos, Ollama e Anthropic — design

- **Data:** 2026-10-17
- **Estado:** aprovado pelo utilizador (resumo apresentado em chat)
- **Base:** módulo `modules/assistant` (spec 2026-09-19, §15) e o assistente de `D:\Repositories\mauricio`
- **Âmbito:** só o módulo `assistant` e as skills `web-assistant` e `web-assistant-tool`

## 1. Objetivo

O assistente passa a mostrar o raciocínio do modelo enquanto responde, a dar títulos curtos às
conversas, a desenhar gráficos calculados no servidor e a suportar Ollama e Anthropic. A UX segue
o `mauricio`: um bloco "a pensar" animado que fecha no fim com "Pensou durante N s", e texto,
tools, propostas e gráficos intercalados pela ordem em que aconteceram, também depois de
recarregar a página.

### Fora de âmbito

- Compactação/resumo de conversas longas (continua a janela das últimas 40 mensagens).
- Vista de conversas de outros utilizadores no admin.
- Outros providers (OpenAI-compatível), que continuam documentados como extensão.

## 2. Providers

- `ChatChunk` ganha `{ type: "thinking", text }` e `{ type: "raw", raw }` (blocos nativos da
  resposta, só em memória). `ChatMessage` ganha `raw?` (nunca persistido).
- **Ollama:** pede `think: true`; quando o modelo recusa (400 com "think"), memoriza-o e repete
  sem pensamento. Lê `message.thinking` do NDJSON.
- **Anthropic** (`@anthropic-ai/sdk`): `beta.messages.stream` com
  `thinking: { type: "adaptive", display: "summarized" }`, tools com `eager_input_streaming`,
  fallback no servidor (`server-side-fallback-2026-07-01`, `fallbacks: "default"`) para os modelos
  que o suportam. Um modelo que recuse thinking adaptativo é memorizado e chamado sem ele.
  `stop_reason: "refusal"` dá o erro `assistant.refused`; `max_tokens` com `tool_use` dá
  `assistant.cut_off`. Modelo por defeito `claude-opus-5-5`, configurável.
- **Chave:** `ANTHROPIC_API_KEY` no ambiente do servidor. Nunca nos settings nem na base de dados.
- **Preserved thinking:** os blocos de pensamento só são reenviados dentro do pedido que os
  produziu. O loop carrega o histórico **uma vez por turno** e depois só acrescenta (append-only);
  turnos anteriores voltam sem blocos de pensamento. Assim nenhum bloco é reenviado com um prefixo
  diferente daquele em que nasceu.
- **Fake:** emite pensamento antes de responder, para os testes.

## 3. Stream e registo ordenado

Eventos SSE: `conversation`, `thinking`, `text`, `tool` (`status: running | done`), `proposal`,
`chart`, `title`, `error`, `done`.

O turno constrói um array `segments` (pensamento com `start`/`end` em ms desde o início do pedido,
texto, tool com tempos, `proposal` por id, `chart`). É guardado numa coluna nova
`assistant_messages.segments` (JSON), na última mensagem de assistente do turno, também quando o
turno acaba em erro. Pensamento limitado a 4000 caracteres por turno.

A vista da conversa devolve, por turno, uma mensagem de assistente com `segments` (ou texto, para
mensagens antigas), sem duplicar o texto das iterações intermédias.

## 4. Títulos ("resumos")

Numa conversa nova, depois do primeiro turno, o servidor pede ao modelo um título de no máximo 5
palavras na língua do utilizador (15 s de limite). Se falhar, fica o início da mensagem. O título
segue no evento `title`.

## 5. Gráficos

Novo tipo de tool, `kind: "chart"`: `run(ctx, args)` devolve um `AssistantChart`
(`type: column | bar | line | area | stacked | donut | radar | table`, `title`, `categories`,
`series[{ name, data }]`, `unit?`). Os números vêm do servidor (via `ctx.api`), nunca do modelo. O
modelo recebe só um resumo (`{ rendered: true, categories, series }`). Ferramenta de referência:
`chart_notes_by_month` em `tools/notes.ts`. O cartão usa as cores `--chart-1..5` do tema.

## 6. Cliente

- `AssistantThinkingBlock.vue`: porta do `ThinkingBlock` do `mauricio`, com pontos animados,
  etiqueta em onda, contador de tempo, fecho automático, chips das tools e
  `prefers-reduced-motion`.
- `AssistantChartCard.vue`: porta do `ChartCard`, com SVG/HTML próprio e sem biblioteca de gráficos.
- `AssistantMarkdown.vue`: `marked` + `DOMPurify`, renderizado só no cliente (no servidor mostra
  texto simples).
- `assistente.vue`: mensagens por segmentos agrupados (pensamento + tools num bloco), cartões de
  proposta e gráficos no sítio certo, estado vazio com sugestões, lista de conversas em painel
  lateral, caixa de texto que cresce.
- Etiquetas das tools por i18n (`assistant.tools.<nome>`), com o nome da tool como fallback.

## 7. Verificação

Testes unitários das partes puras (conversão para a Anthropic, leitura do NDJSON do Ollama,
construção e agrupamento de segmentos, normalização de gráficos) e testes de API com o provider
fake (pensamento no stream, `segments` guardados, título, gráfico). Verificação num projeto
descartável: `new-project.mjs` + módulo + edições da skill + `db:generate`, depois `npm run check`
e `npm run test:api`.
