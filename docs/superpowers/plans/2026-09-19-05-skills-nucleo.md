# Plano 5 — Skills do núcleo

> Plano 5: as skills do núcleo do web-foundation (projeto novo, recurso CRUD, realtime, tema, deploy, audit).

> Executado inline, como os planos anteriores. O plano fixa os ficheiros, o conteúdo esperado de cada skill e a verificação; o texto vive nos commits.

**Goal:** Escrever as skills que tornam o template utilizável pelo Claude noutros projetos: criar um projeto, acrescentar um recurso ou um evento em tempo real, importar um tema, fazer deploy e auditar a segurança.

**Spec:** §2 (lista de skills e regra "o template é a fonte da verdade"), §8 (padrão CRUD), §11, §14 e §16.

## Decisões

- **Formato:** `skills/<nome>/SKILL.md` com frontmatter `name` e `description`. A `description` diz *quando* usar a skill (é o que o Claude lê para decidir), em inglês, e começa por "Use when".
- **Sem código duplicado:** as skills apontam para ficheiros do template (`templates/nuxt-base/...`) como molde e só descrevem os passos, as regras e a verificação. O recurso `notes` é o molde do CRUD.
- **Caminho do template:** as skills referem `${CLAUDE_PLUGIN_ROOT}/templates/nuxt-base`. Quando o plugin não está instalado (trabalho dentro deste repo), o caminho é `templates/nuxt-base`.
- **Idioma:** as instruções das skills ficam em inglês, como o código. O texto de interface continua a ir para as chaves i18n (pt-PT por defeito).
- **Cada skill acaba numa verificação concreta:** `npm run check`, `npm run test:api` ou um comando de smoke.
- **`web-new-project` com script:** um script Node (`skills/web-new-project/scripts/new-project.mjs`) copia o template sem `node_modules`, `.output`, `.nuxt` e `.env`, e troca o nome do pacote, o `appName`, o nome da DB e o nome do projeto compose. Tem teste unitário próprio numa pasta temporária.

## Skills

| Skill | Conteúdo |
|---|---|
| `web-foundation` | Mapa do template, as regras do núcleo (ordem dos handlers, permissões, erros, i18n, realtime, settings), quando usar cada outra skill, armadilhas |
| `web-new-project` | Perguntas mínimas (nome, pasta, idioma por defeito), o script de cópia, `gen-secrets`, `npm install`, `docker compose up -d db`, `npm run db:migrate`, `npm run check`, primeiro commit |
| `web-crud-resource` | Checklist do molde `notes`: schema Drizzle, `db:generate`, schemas zod partilhados, matriz de permissões, service com auditoria e publish, handlers, erros i18n, página, navegação, testes de API |
| `web-realtime-event` | Escolher o tópico, publicar depois do commit só com ids, autorização em `authorizeTopic`, `useRealtimeEvent`/`useLiveResource` no cliente, teste com `openSocket` |
| `web-theme` | Importar um tema tweakcn (ou outro CSS com variáveis shadcn) para `app/assets/css/themes/<nome>.css` sob `[data-theme]`, registar em `THEMES`, chave i18n, verificar os dois modos |
| `web-deploy` | Docker (compose, entrypoint, proxy com upgrade de WebSocket), sem Docker (systemd + `node --env-file`), backups, checklist de produção |
| `web-audit` | Checklist de segurança sobre um projeto derivado: segredos, sessões, permissões em todos os handlers, rate limits, headers, uploads, dependências, com o comando para cada verificação |

## Tasks

1. **`web-new-project`:** script de cópia, teste unitário e SKILL.md. Verificar com uma cópia real para uma pasta temporária e `npm run check` nela (sem install completo se o tempo não deixar: pelo menos o teste do script).
2. **`web-foundation`** e **`web-crud-resource`**.
3. **`web-realtime-event`**, **`web-theme`**, **`web-deploy`** e **`web-audit`**.
4. **README do repo** com a lista de skills e como instalar o plugin; atualizar `skills/README.md`.
