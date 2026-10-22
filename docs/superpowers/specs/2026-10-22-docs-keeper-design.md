# docs-keeper — design

> Plugin que mantém a documentação de um projeto em `docs/`, uma pasta por categoria e um ficheiro por tema, sempre referenciada no `CLAUDE.md`.

Updated: 2026-10-22
Sources: plugins/docs-keeper/

- **Data:** 2026-10-22
- **Estado:** aprovado pelo utilizador
- **Âmbito:** novo plugin `docs-keeper` no marketplace `gv-agent-skills`, ao lado do
  `web-foundation` e do `dev-crew`. Serve qualquer projeto.

## 1. Objetivo

O Claude deve manter a documentação do projeto sem que lho peçam: detetar que categorias o
projeto tem, criar os ficheiros que faltam, atualizá-los quando o código muda, e garantir que
todos estão referenciados no `CLAUDE.md`, para que a próxima sessão os encontre.

## 2. Categorias

Uma pasta por categoria, um ficheiro por tema. As categorias são por assunto, finas, e só
existem as que o projeto tem (pedido do utilizador: "arquitetura deve ter uma, UI e theming
outra"):

| Pasta | Assunto | Sinais para a detetar |
|---|---|---|
| `architecture/` | visão geral, camadas, fluxo de dados, estrutura de pastas | sempre |
| `ui/` | componentes, layout, theming, design system | framework de frontend, pasta de componentes, CSS/Tailwind, temas |
| `data/` | base de dados, esquema, migrações, modelos | ORM, migrações, ficheiros SQL |
| `api/` | endpoints, contratos, erros | pasta de rotas do servidor, OpenAPI |
| `auth/` | autenticação, sessões, permissões | biblioteca de auth, matriz de permissões |
| `realtime/` | WebSocket, SSE, eventos | servidor WS/SSE |
| `i18n/` | línguas, chaves, formatos | pasta de locales |
| `testing/` | estratégia, comandos, fixtures | pasta e config de testes |
| `operations/` | deploy, ambientes, backups, CI | Dockerfile, compose, CI, scripts de deploy |
| `integrations/` | serviços externos e SDKs | SDKs de terceiros, chaves de API no `.env.example` |
| `features/` | uma funcionalidade por ficheiro | módulos ou recursos do domínio |
| `decisions/` | uma decisão por ficheiro | sempre que há decisões |
| `guides/` | setup, tarefas frequentes | sempre |

Pastas que já existem em `docs/` (por exemplo `superpowers/`) são categorias do projeto: entram
no índice e não são reorganizadas.

## 3. Formato de cada ficheiro

```
# <Título>

> <Uma linha: o que este documento cobre.>

Updated: <yyyy-mm-dd>
Sources: <caminhos de código que o documento descreve, separados por vírgula>
```

O resto é livre. O resumo é o que aparece no índice. `Sources:` é o que permite saber quando
o documento ficou desatualizado.

## 4. Script `docs-index.mjs`

- `index`: lê `docs/**/*.md`, tira o título e o resumo de cada um, e escreve no `CLAUDE.md`,
  entre `<!-- docs-index:start -->` e `<!-- docs-index:end -->`, uma lista por categoria com
  ligação e resumo. Se os marcadores não existem, acrescenta uma secção `## Docs`. Se o
  `CLAUDE.md` não existe, cria-o. Mantém os finais de linha do ficheiro.
- `check`: falha (código 1) se o índice no `CLAUDE.md` não for o que `index` escreveria, e diz
  o que falta ou sobra.
- `stale`: para cada documento com `Updated:` e `Sources:`, lista os que têm uma fonte com um
  commit mais recente do que a data `Updated:`.

## 5. Skill

Ativa quando o Claude muda algo que a documentação descreve, quando acaba uma tarefa com
alterações de código, ou quando se pede para documentar. Passos: detetar categorias, criar o
que falta, atualizar o que mudou (com `stale` a ajudar), correr `index`, e `check` antes de
commit. Escreve na língua de `docs.language` em `docs/settings.md`. Nunca apaga um documento
sem perguntar.

## 6. Ligação ao dev-crew

O scribe da dev-crew segue o mesmo formato e layout quando o `docs-keeper` está instalado, e
corre `index` depois de escrever.

## 7. Fora de âmbito (por agora)

Um hook que corre `check` no fim de cada sessão. Fica como opção para o utilizador ligar.
