# Fundação para websites — design

> Design da fundação para websites: template Nuxt 4, regras do núcleo, skills e módulos.

- **Data:** 2026-09-19
- **Estado:** proposta para revisão
- **Fontes analisadas:** `mauricio`, `simple-band-inventory`, `simple-parish-manager` (Nuxt 4 + Drizzle + MySQL) e `model-inference-platform` (FastAPI + Nuxt SPA)

## 1. Objetivo

Este repositório (`agent-skills`) passa a ser a base para desenvolver websites rapidamente com o Claude. Contém:

1. um **template canónico** (`templates/nuxt-base/`), que corre e tem testes, com o núcleo comum a todos os projetos;
2. **skills modulares** que criam projetos a partir do template e lhes acrescentam funcionalidades de forma consistente.

A fundação junta o que funcionou nos quatro repos e corrige o que se repetiu mal neles: permissões duplicadas, confirmações inline, falta de toasts, schema sem migrações, porta extra para WebSocket, ausência de i18n e READMEs desatualizados.

### Fora de âmbito

- Stacks não-Nuxt. O backend separado (FastAPI) fica documentado como variante, sem template.
- SQLite ou Postgres. Só MySQL 8.4; o Drizzle permite mudar mais tarde.
- Pagamentos, email transacional, OAuth. Entram como módulos futuros quando forem precisos.

## 2. Estrutura do repositório

O repo é um **plugin do Claude Code**, instalável via marketplace:

```
agent-skills/
  .claude-plugin/plugin.json
  README.md                       como instalar e usar
  CLAUDE.md                       regras para trabalhar neste repo
  templates/
    nuxt-base/                    projeto completo e executável (núcleo)
  modules/                        código dos módulos opcionais, aplicado pelas skills
    assistant/  pwa/  tenancy/  public-site/
  skills/
    web-foundation/               referência: convenções, arquitetura, decisões
    web-new-project/              copia o template, renomeia, gera secrets e .env
    web-crud-resource/            schema + migração + service + API + permissões + páginas + testes
    web-realtime-event/           acrescenta um evento em tempo real a um recurso
    web-assistant/                instala o módulo do assistente
    web-assistant-tool/           acrescenta uma ferramenta ao assistente
    web-pwa/                      instala o módulo PWA
    web-tenancy/                  instala o multi-tenant (âmbito por organização)
    web-public-site/              páginas públicas, SEO, sitemap
    web-theme/                    importa um tema tweakcn
    web-deploy/                   Docker, deploy sem Docker, proxy, backups
    web-audit/                    checklist de segurança sobre um projeto
  docs/superpowers/{specs,plans}/
```

Regra: **o template é a fonte da verdade**. As skills descrevem os pontos de extensão do template e não duplicam o código dele. Uma alteração ao núcleo faz-se no template e nos testes dele.

## 3. Stack

| Área | Escolha | Nota |
|---|---|---|
| Framework | Nuxt 4 full-stack, Nitro `node-server`, TypeScript | um só código, uma só linguagem |
| UI | shadcn-vue (reka-ui) | adicionar só os componentes usados, em `app/components/ui` |
| CSS | Tailwind v4 CSS-first (`@tailwindcss/vite`), `tw-animate-css` | sem `tailwind.config` |
| Ícones | `@lucide/vue` | só esta biblioteca |
| DB / ORM | MySQL 8.4 + `drizzle-orm` + `drizzle-kit` | migrações versionadas |
| Validação | zod v4 | schemas em `shared/schemas`, usados no servidor e nos forms |
| Forms | vee-validate + `@vee-validate/zod` | |
| Auth | `nuxt-auth-utils` | cookie selado, scrypt |
| Tempo real | WebSocket do Nitro (crossws), **mesma porta** | `nitro.experimental.websocket = true` |
| Toasts | vue-sonner | |
| Tema | `@nuxtjs/color-mode` + temas tweakcn | |
| i18n | `@nuxtjs/i18n` | pt-PT por defeito, en-US |
| Gráficos | shadcn chart (unovis) | só quando necessário |
| Testes | vitest; Playwright para e2e | |
| Qualidade | `@nuxt/eslint`, `nuxt typecheck` | |
| Package manager | npm | um só lockfile |

## 4. Arquitetura

```
app/
  pages/ layouts/ middleware/ plugins/ composables/
  components/ui/          shadcn (gerados)
  components/app/         componentes da fundação
  components/<domínio>/   componentes de cada domínio
  assets/css/main.css     tokens + themes/*.css
server/
  api/<recurso>/          index.get, index.post, [id].get, [id].patch, [id].delete
  services/<domínio>.ts   lógica de negócio e acesso à DB
  realtime/               hub WebSocket, tópicos, broadcast
  db/schema/<domínio>.ts  um ficheiro por domínio + index.ts
  middleware/             01.session 02.maintenance 03.rate-limit 04.no-store
  routes/_ws.ts           endpoint WebSocket
  plugins/                guard de secrets, arranque do hub
  utils/                  guards, erros, rate limiter, settings
shared/
  schemas/                zod (inputs/outputs das APIs)
  permissions.ts          matriz de roles e can()
  types/ utils/           código puro e testado
drizzle/                  migrações SQL geradas + meta
scripts/                  baseline-migrations.mjs, seed.ts, fake.ts, truncate.ts
i18n/locales/             pt-PT.json, en-US.json
test/unit/ test/api/ test/e2e/
```

### Regras

1. **Handlers finos.** Um handler faz, por ordem:
   - `requireUser`;
   - `assertPermission`;
   - validar o input com zod (`readValidatedBody(event, schema.parse)`);
   - chamar o service;
   - fazer o broadcast.

   O handler não contém lógica de negócio.
2. **Services** recebem `(ctx, input)`, em que `ctx = { user, db }`. São chamados pela REST, pelos scripts e pelos testes. Transações só dentro dos services.
3. **Erros:** todas as respostas de erro seguem o envelope `createError({ statusCode, message, data: { code } })`.
   - `code` é uma chave estável, por exemplo `auth.invalid_credentials` ou `users.last_admin`.
   - O cliente traduz a mensagem pelo `code`, e o `message` serve de fallback.
4. **`$api`:** plugin cliente que envolve o `$fetch`.
   - Encaminha os cookies em SSR.
   - Um 401 envia para `/entrar`.
   - Um 403 com `auth.password_change_required` envia para `/conta/password`.
5. **Sem código específico do domínio no núcleo.** O template traz só utilizadores, sessões, definições, auditoria e um recurso de exemplo (`notes`), que a skill `web-crud-resource` usa como modelo.

## 5. Autenticação

- **Sessão:** `nuxt-auth-utils`, cookie `httpOnly`, `sameSite: lax`, `secure` em produção. O cookie guarda `{ user, sid }`.
- **Tabela `sessions`:** `id, userId, ip, userAgent, createdAt, lastSeenAt, expiresAt, revokedAt`.
  - O middleware `01.session` valida a sessão em cada pedido. Se a sessão estiver revogada ou expirada, ou se o utilizador estiver inativo, limpa-a e responde 401.
  - `lastSeenAt` é atualizado no máximo 1 vez por minuto.
- **`passwordVersion`** no utilizador: mudar a password incrementa-o e revoga as outras sessões.
- **Lembrar-me:** 30 dias; sem essa opção, 1 dia.
- **Passwords:** `hashPassword`/`verifyPassword` (scrypt), mínimo de 12 caracteres, validação partilhada em `shared/schemas/password.ts`.
- **Login:**
  - Rate limit por IP, configurável em `settings`.
  - 401 genérico.
  - Hash fictício quando o email não existe, para o tempo de resposta ser igual.
- **Primeiro arranque:** `/setup` só existe enquanto não houver utilizadores.
  - Exige o `NUXT_SETUP_CODE`, comparado em tempo constante e com rate limit.
  - Depois do hash, volta a contar os utilizadores dentro de uma transação para evitar corridas.
  - Com o código vazio, o setup fica desativado.
- **`mustChangePassword`:** passwords geradas por um admin obrigam a mudar no primeiro login.
- **Convites:** o admin cria um convite com um token guardado em hash, TTL configurável e role predefinida. A página `/convite/[token]` define a password. Não há registo público.
- **Guard de secrets** (plugin de arranque): em produção, o servidor recusa arrancar se `NUXT_SESSION_PASSWORD` tiver menos de 32 caracteres ou contiver `change-me`/`example`.
- **`04.no-store`:** `Cache-Control: no-store` em `/api/**`.

## 6. Roles e permissões

Há uma só matriz, partilhada entre cliente e servidor:

```ts
// shared/permissions.ts
export const ROLES = ["admin", "editor", "user"] as const
export type Role = (typeof ROLES)[number]
export type Resource = "users" | "settings" | "audit" | "notes" /* | ...módulos */
export type Action = "read" | "create" | "update" | "delete" | "manage"

export const PERMISSIONS: Record<Role, Partial<Record<Resource, readonly Action[]>>> = {
  admin: { users: CRUD, settings: CRUD, audit: ["read"], notes: CRUD },
  editor: { notes: CRUD },
  user: { notes: ["read"] },
}

export function can(roles: readonly Role[], resource: Resource, action: Action): boolean
```

- Um utilizador tem `roles: Role[]`, guardado numa coluna JSON e validado com zod ao ler.
- **Servidor:**
  - `requireUser(event)` devolve o utilizador relido da DB.
  - `assertPermission(user, resource, action)` lança 403 com o code `auth.forbidden`.
  - A **posse** de um registo verifica-se no service (`ensureOwnerOrPermission`).
- **Cliente:**
  - `useCan()` usa o mesmo `can()`.
  - `<Can resource action>` mostra o conteúdo só se a permissão existir.
  - O middleware de rota lê `definePageMeta({ permission: ["users", "read"] })`.
- **Navegação como dados:** `app/utils/navigation.ts` define `{ to, icon, labelKey, permission?, group }`. Sidebar, menus e o assistente filtram por `can()`.
- **Invariante no service:** nunca ficar sem nenhum admin ativo. O admin também não pode desativar a sua própria conta nem retirar a si próprio a role de admin.
- **"Ver como" (mimic):** um admin pode assumir temporariamente outras roles para testar a UI. As roles originais ficam guardadas em `originalRoles` na sessão, com um aviso fixo no topo.
- **Princípio:** a UI só desenha; **o servidor verifica sempre**.
- **Multi-tenant** é um módulo (`web-tenancy`). Acrescenta `organizations` e `memberships(role)`, o guard `requireMembership` e a coluna `organizationId` nos recursos, e troca o âmbito dos tópicos realtime para `org:<id>`.

## 7. Tempo real (WebSockets), no núcleo

Liga-se `nitro.experimental.websocket = true`. O endpoint único é `server/routes/_ws.ts`, na mesma porta e origem da app. Não há segunda porta nem configuração extra no proxy além do upgrade.

### Autenticação

- No hook `upgrade`, `requireUserSession(request)` (suportado pelo `nuxt-auth-utils`) e validação da linha em `sessions`. Se falhar, o upgrade é recusado.
- O `peer` guarda `{ userId, sid, roles }`.
- Quando uma sessão é revogada, `hub.disconnectSession(sid)` fecha as ligações dela. Mudanças de roles fazem `hub.refreshUser(userId)`.

### Tópicos

| Tópico | Quem subscreve | Uso |
|---|---|---|
| `user:<id>` | automaticamente, o próprio utilizador | notificações, cartões do assistente, sessão revogada |
| `res:<recurso>` | quem tem `can(recurso, "read")` | listas que se atualizam sozinhas |
| `res:<recurso>:<id>` | quem tem `can(recurso, "read")` | página de detalhe |
| `org:<id>` | membros (módulo tenancy) | âmbito multi-tenant |
| `system` | todos | manutenção, nova versão |

A subscrição de `res:*` é pedida pelo cliente e **autorizada no servidor** com `can()` e o âmbito aplicável. Um pedido não autorizado é ignorado e o servidor responde com `error`.

### Protocolo (JSON)

```ts
// cliente -> servidor
{ type: "subscribe" | "unsubscribe", topic: string }
{ type: "ping" }

// servidor -> cliente
{ type: "ready" }                                   // após o upgrade; o cliente volta a pedir os dados
{ type: "event", topic, event: string, data, ts }   // ex.: event "notes.updated"
{ type: "error", code }
{ type: "pong" }
```

### Servidor

- `server/realtime/hub.ts` guarda `Map<topic, Set<peer>>` e `Map<userId, Set<peer>>`.
- API: `publish(topic, event, data)`, `publishToUser(userId, event, data)`, `disconnectSession(sid)`.
- O broadcast faz-se **depois do commit** da transação, nunca lá dentro.
- Os payloads levam só ids e campos mínimos; o cliente volta a pedir os dados pela REST se precisar. Assim não se contornam permissões ao nível dos campos.
- Heartbeat: um peer sem atividade durante 60 s é fechado.
- Só há uma instância. Várias instâncias precisariam de um adaptador pub/sub (Redis); fica fora de âmbito, mas o hub deve estar isolado atrás de uma interface para isso ser possível mais tarde.

### Cliente

- `useRealtime()` é singleton e liga só com a sessão iniciada.
  - Reconexão com backoff exponencial e jitter.
  - Volta a subscrever os tópicos ao reconectar.
  - Expõe o estado `connecting | open | closed`.
- `on(event, handler)` devolve `off`. É desligado sozinho em `onScopeDispose`.
- `useLiveResource(recurso, fetcher)` subscreve `res:<recurso>`. Com `*.created|updated|deleted` faz refetch com debounce, e com `ready` também faz refetch.
- Um indicador discreto no header mostra quando a ligação caiu.
- Eventos do núcleo:
  - `session.revoked`: logout e redirect.
  - `system.maintenance`: banner.
  - `user.updated`: refresh da sessão.

### Proxy

- Caddy faz o upgrade automaticamente.
- nginx precisa de `proxy_http_version 1.1`, `Upgrade` e `Connection "upgrade"`, e de um `proxy_read_timeout` alto. Os exemplos estão em `web-deploy`.

## 8. Páginas e layouts

### Layouts

- `public`: header, conteúdo e footer; para o site público.
- `auth`: cartão centrado.
- `app`: `SidebarProvider` + `AppSidebar` + header com título da página, indicador realtime, `LocaleSwitcher`, `ThemeToggle` e `UserMenu`.
- `blank`: para impressão e páginas de erro especiais.

O título e o subtítulo vêm de `definePageMeta({ titleKey, subtitleKey })`.

### Páginas do núcleo

| Rota | Layout | Acesso |
|---|---|---|
| `/` | public | público (landing simples, substituível) |
| `/entrar` | auth | só sem sessão |
| `/setup` | auth | só sem utilizadores |
| `/convite/[token]` | auth | público com token válido |
| `/app` | app | com sessão (dashboard) |
| `/app/notes`, `/app/notes/[id]` | app | recurso de exemplo |
| `/conta` | app | perfil, password, sessões ativas (com revogar), preferências |
| `/admin/utilizadores` | app | `users:read` |
| `/admin/definicoes` | app | `settings:manage`, separadores: geral, segurança, aparência, manutenção (+ assistente se instalado) |
| `/admin/auditoria` | app | `audit:read` |
| `/manutencao`, `/privacidade` | public | público |
| `error.vue` | — | 404/403/500 traduzidos |

### Padrão CRUD (`web-crud-resource`)

- Lista em `DataTable` e detalhe/edição em página ou em `ResponsiveDialog`.
- Entidades pequenas usam só o dialog.
- As entidades com muitos campos têm páginas `index`, `novo` e `[id]`.

## 9. Dialogs, confirmações e notificações

- **`useConfirm()`:** API com promise, e um só `<ConfirmHost/>` montado em `app.vue`.
  ```ts
  const ok = await confirm({
    title: t("notes.delete.title"),
    description: t("notes.delete.body", { name }),
    confirmLabel: t("common.delete"),
    destructive: true,
    typeToConfirm: name,              // opcional: o utilizador escreve o nome para confirmar
    action: () => api(`/api/notes/${id}`, { method: "DELETE" }), // opcional
  })
  ```
  - Com `action`, o dialog mostra o estado pending e mantém-se aberto se der erro, mostrando-o lá dentro.
  - Nunca se usa `window.confirm()`, porque bloqueia a thread e o WebSocket.
- **`useSecretDialog()`:** mostra uma vez uma password gerada ou um link de convite, com botão de copiar e o aviso de que não volta a ser mostrado.
- **`<ResponsiveDialog>`:** Dialog no desktop e Sheet no telemóvel. É a base dos forms em dialog.
- **Forms em dialog:** submit com estado pending, e o dialog não fecha enquanto há um pedido em curso. Se houver alterações por guardar, pede confirmação ao fechar.
- **`useNotify()`:** envolve o vue-sonner. `notify.success(key)`, e `notify.error(e)` extrai o `code` e traduz.
- `<Toaster rich-colors position="top-center">` em `app.vue`.

## 10. Componentes

### `components/app/`

- **Estrutura da página:** `PageHeader` (título, descrição, ações) e `EmptyState`.
- **Tabelas:** `DataTable`, com colunas declarativas, pesquisa sem acentos (`normalizeText`), ordenação e paginação de 10, 25, 50 ou 100 linhas. Tem modo cliente e modo servidor (`?q&sort&page&size`), e skeleton durante o carregamento.
- **Formulários:** `FormField`, `SearchSelect` (combobox com a opção "criar"), `DatePicker` e `DateTimePicker`.
- **Navegação e utilizador:** `AppSidebar`, `UserMenu`, `ThemeToggle` (claro, escuro ou sistema), `LocaleSwitcher`, `RealtimeIndicator`.
- **Conteúdo:** `StatCard` e `Markdown` (marked + DOMPurify).
- **Permissões:** `Can`.

### Composables

`useApi`, `useSession`, `useCan`, `useConfirm`, `useSecretDialog`, `useNotify`, `useRealtime`, `useLiveResource`, `usePager`, `useAppTheme`.

### `shared/utils`

`normalizeText`, formatadores por locale (data, moeda, número), `niceTicks`.

## 11. Temas

- Tokens shadcn em **oklch** (`--background`, `--primary`, ...) mais os tokens da fundação: `--success`, `--warning`, `--danger` e `--chart-1..5`.
  - O contraste é verificado.
  - Há uma paleta pensada para daltónicos nos gráficos de entradas e saídas.
- Temas tweakcn em `app/assets/css/themes/<nome>.css` com o seletor `[data-theme="<nome>"]`.
  - O admin escolhe o tema por defeito em `settings`.
  - O utilizador pode sobrepor-lhe o seu, se `settings.appearance.userThemes` estiver ativo.
- O tema fica num cookie (`app-theme`), para o SSR aplicar o `data-theme` e a página não piscar.
- Modo claro/escuro com `@nuxtjs/color-mode` (`classSuffix: ""`, preferência `system`).
- Favicon SVG tingido com a `--primary` do tema.
- Shim CSS que mapeia `data-open` e `data-checked` para o `data-state` do reka-ui.
- Fontes via `@fontsource-variable/*`, definidas por tema.

## 12. Definições, auditoria, manutenção

- **`settings`** (chave e valor JSON), lida via `getSetting(key)` e validada por um schema zod por chave, com cache de 30 s.
  - Precedência: **DB > env > default no código**.
  - Os segredos, como tokens, nunca são devolvidos ao cliente: a API devolve só `hasToken`.
- **`audit_log`:** `id, userId, action, resource, resourceId, meta JSON, ip, createdAt`.
  - Os services chamam `audit(ctx, ...)` nas ações admin, nas mudanças de permissões e nas escritas do assistente.
  - Pode ser consultado em `/admin/auditoria`.
- **Manutenção:** ligada em `settings` ou por ficheiro. O middleware `02.maintenance` bloqueia quem não é admin, e é emitido um evento `system.maintenance`.
- **Rate limit** (`03.rate-limit`): em memória, por IP e rota, configurável. Os pedidos internos do assistente passam com um nonce.
- **`/api/health`:** verifica a DB, devolve a versão, e o estado do hub realtime.

## 13. i18n

- `@nuxtjs/i18n` com a estratégia `no_prefix`, cookie `i18n_locale` e lazy loading.
- Ordem de escolha do idioma: locale forçado pelo admin, depois a preferência do utilizador, depois o browser.
- Formatos de número e data definidos em `i18n.config.ts`.
- O servidor devolve **códigos**, não texto, e o cliente traduz.
- Os e-mails e textos gerados no servidor, se existirem, usam o locale do utilizador.

## 14. Deployment

### Com Docker

- **Dockerfile** multi-stage em `node:24-slim`:
  - `deps` corre `npm ci`;
  - `build` corre `npm run build`;
  - `release` leva `.output`, `drizzle/`, `scripts/`, o `default-mysql-client` e um utilizador sem privilégios.
- **`entrypoint.sh`** (`set -e`):
  1. espera pela DB (`mysqladmin ping` com limite de tentativas);
  2. corre `node scripts/baseline-migrations.mjs`, que marca a baseline se o schema já existir sem histórico e recusa se não bater;
  3. corre `drizzle-kit migrate`;
  4. corre o seed se não houver utilizadores e `SEED_ADMIN_*` estiver definido (caso contrário, o fluxo `/setup` trata disso);
  5. `exec node .output/server/index.mjs`.
- **`docker-compose.yaml`:**
  - `app`, com healthcheck em `/api/health`;
  - `db` (`mysql:8.4`, com healthcheck e volume);
  - `phpmyadmin` com `profiles: ["tools"]`.
  - As portas vêm do env (`APP_PORT`, `DB_PORT`, `PMA_PORT`), para correr vários projetos lado a lado.
  - Volume `uploads` quando for preciso.
- **Nunca usar `drizzle-kit push`** em produção. Rever sempre o SQL gerado antes de o commitar.

### Sem Docker

- `npm run dev` corre `node --env-file=.env` sobre o CLI do nuxt, porque o dev simples não carrega o `.env`.
- Produção: `npm run build`, `npm run db:migrate` e `npm run start` (`node --env-file=.env .output/server/index.mjs`).
- Exemplos de serviço: unidade systemd e NSSM para Windows.

### Scripts incluídos

- `scripts/gen-secrets.ps1` e `.sh`: escrevem só as linhas env no stdout (session password de 48 bytes e setup code sem caracteres ambíguos), para se poder fazer `>> .env`.
- `scripts/docker-clean.ps1`: limpeza limitada ao projeto do compose, com confirmação.
- `scripts/backup.ps1` e `.sh`: `mysqldump` para `backups/`, que fica no gitignore.

### Proxy

Exemplos de Caddyfile e nginx com HTTPS, upgrade WebSocket, `X-Accel-Buffering: no` para SSE e `NUXT_TRUST_PROXY` para obter o IP real.

### `.env.example` documentado

`DATABASE_URL`, `MYSQL_*`, `NUXT_SESSION_PASSWORD`, `NUXT_SETUP_CODE`, `NUXT_TRUST_PROXY`, `NUXT_PUBLIC_APP_NAME`, `APP_PORT`, `DB_PORT`, `SEED_ADMIN_*`, e as variáveis dos módulos.

## 15. Módulos opcionais

| Módulo | Conteúdo | Pontos de extensão usados |
|---|---|---|
| **assistant** | provider (interface `ChatProvider`, Ollama primeiro), `POST /api/assistant/chat` em SSE, registo `defineTool`, cartões propose/claim/settle, conversas persistidas, config em `settings`, página `/assistente` | matriz de permissões, navegação, separador em definições, tópico `user:<id>` para o estado dos cartões, auditoria |
| **pwa** | rota de manifest, `sw.js` com precache gerado num hook do nitro, página `/offline`, prompt de instalação | `nuxt.config`, layout |
| **tenancy** | organizações, memberships, seletor de organização, `requireMembership`, tópicos `org:<id>` | guards, matriz, hub realtime |
| **public-site** | páginas públicas, SEO (`useSeoMeta`), sitemap, robots, `/llms.txt`, consentimento de cookies | layout `public` |

### Regras do assistente

Vêm do `simple-parish-manager`:

- As ferramentas de leitura chamam os **próprios endpoints** via `event.$fetch`, com o cookie do utilizador. Nunca vão diretas à DB, para que as permissões se apliquem sozinhas.
- A lista de ferramentas enviada ao modelo é filtrada por `can()` e volta a ser verificada quando a ferramenta corre.
- As escritas usam **só** `propose_*`, que produz um cartão:
  - o `claim` é atómico (`UPDATE ... WHERE state='pending'`, 409 se já foi tratado);
  - o browser chama a REST normal;
  - o `settle` é verificado pelo servidor, que relê a DB;
  - no fim, é anexada uma nota de sistema à conversa.
- Os campos com dados pessoais passam por uma **allowlist**.
- O loop tem no máximo 6 iterações e 120 s, com `X-Accel-Buffering: no`.
- O assistente está desligado por defeito.

## 16. Testes e qualidade

- **Unit (vitest):** tudo em `shared/` e `server/utils`, incluindo permissões, rate limiter, parser do protocolo realtime e config.
- **API:** `@nuxt/test-utils` com uma DB MySQL de teste (compose `test`), para auth, guards e o CRUD de exemplo.
- **Realtime:** teste que abre dois clientes WebSocket e verifica a autorização de tópicos e o broadcast depois do commit.
- **E2E (Playwright):** smoke de setup, login, CRUD, confirmação de apagar e logout, sobre uma DB isolada.
- `npm run check` corre lint, typecheck e testes unitários. O template tem de passar antes de qualquer commit no núcleo.

## 17. Convenções

- O código, os comentários e os identificadores ficam em inglês. O texto visível vem das chaves i18n, com pt-PT por defeito.
- Nomes de rotas: há que escolher entre português (`/entrar`, `/conta`) e inglês. **Decisão: português nas páginas e inglês nas APIs** (`/api/users`).
- Commits em conventional commits.
- O CLAUDE.md de cada projeto é curto (comandos, regras, armadilhas); o raciocínio vive em `docs/superpowers/specs`.
- Nunca commitar credenciais, dumps, `.env` ou logs de ferramentas (`.playwright-mcp/`).

## 18. Plano de entrega (alto nível)

1. Esqueleto do repo: plugin, README e CLAUDE.md.
2. Template `nuxt-base`:
   - scaffold, stack e tema;
   - DB e migrações;
   - auth e sessões;
   - permissões;
   - realtime;
   - dialogs e componentes;
   - páginas do núcleo;
   - i18n;
   - deploy;
   - testes.
3. Skills do núcleo: `web-foundation`, `web-new-project`, `web-crud-resource`, `web-realtime-event`, `web-deploy`, `web-theme`, `web-audit`.
4. Módulos: `assistant`, depois `pwa`, `tenancy` e `public-site`, cada um com a sua skill.

Cada fase tem o seu plano em `docs/superpowers/plans/`.
