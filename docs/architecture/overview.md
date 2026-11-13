# Visão geral do repo

> Como o repo está organizado: um marketplace com quatro plugins (web-foundation, dev-crew, docs-keeper, mock-kit), o que cada um traz e onde vive.

Updated: 2026-11-13
Sources: .claude-plugin/, skills/, templates/, modules/, plugins/

## O que é

Um marketplace de plugins do Claude Code, `gv-agent-skills` (`.claude-plugin/marketplace.json`).
O nome não pode ser `agent-skills`, que está reservado para os marketplaces da Anthropic.

| Plugin | Onde | O que traz |
|---|---|---|
| `web-foundation` | raiz do repo | o template Nuxt 4 em `templates/nuxt-base/`, os módulos opcionais em `modules/` e as skills `web-*` em `skills/` |
| `dev-crew` | `plugins/dev-crew/` | a skill `dev-crew`, quatro agentes (`coordinator`, `developer`, `checker`, `scribe`) e `worktrees.mjs` |
| `docs-keeper` | `plugins/docs-keeper/` | a skill `docs-keeper`, as categorias e o formato dos docs, e `docs-index.mjs` |
| `mock-kit` | `plugins/mock-kit/` | a skill `mock-kit`, o kit para o browser (Vue 3, Tailwind, Lucide por CDN), o shell de componentes e `mock-kit.mjs` (init, new, component, index, check, serve, shots) |

## Onde vive cada coisa

- `templates/nuxt-base/`: a app de referência. É a fonte de verdade: as skills apontam para os
  seus ficheiros e nunca copiam código.
- `modules/<nome>/files`: ficheiros que `skills/web-foundation/scripts/apply-module.mjs` copia
  para um projeto; as edições ao núcleo estão na skill do módulo.
- `skills/<nome>/SKILL.md` e `scripts/`: as skills do `web-foundation`.
- `plugins/<plugin>/`: os outros plugins, cada um com o seu `.claude-plugin/plugin.json`,
  `skills/` e, na dev-crew, `agents/`.
- `docs/`: as preferências (`settings.md`), a arquitetura e os guias, e em `superpowers/` os
  specs e planos de cada funcionalidade.

## Como as peças se ligam

- `docs/settings.md` guarda as preferências de trabalho; as skills dos três plugins leem-no e
  perguntam uma vez o que estiver vazio.
- O scribe da dev-crew segue o layout do docs-keeper quando este está instalado.
- O índice de `docs/` no `CLAUDE.md` é escrito por `docs-index.mjs index`, nunca à mão.
