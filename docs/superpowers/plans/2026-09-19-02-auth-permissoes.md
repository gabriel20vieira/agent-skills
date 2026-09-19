# Plano 2 — Auth, sessões, permissões, definições, auditoria

> **For agentic workers:** executado inline pela sessão que o escreveu (escolha do utilizador: "tudo, na main").
> Por isso este plano fixa **ficheiros, interfaces, comportamentos e casos de teste**. O código completo vive nos commits: repeti-lo aqui duplicaria o trabalho sem acrescentar precisão. Cada task segue TDD (teste a falhar, implementação, verde, commit).

**Goal:** O servidor passa a ter:
- contas e sessões revogáveis;
- matriz de permissões partilhada entre cliente e servidor;
- definições em DB, auditoria, rate limit e modo de manutenção.

O cliente passa a ter:
- `useSession`, `useCan`, `$api` e middleware de rota;
- as páginas de autenticação.

**Spec:** `docs/superpowers/specs/2026-09-19-website-foundation-design.md` §5, §6, §12, §13 (locale do utilizador), §16 (testes de API).

**Tech Stack:** nuxt-auth-utils 0.5 (cookie selado + scrypt), drizzle, zod 4, @nuxt/test-utils 4 (e2e contra MySQL de teste), shadcn-vue (input, label, card, checkbox, alert).

## Global Constraints

As mesmas do plano 1, mais:
- **Erros:** sempre `throw fail(status, "domínio.código")`. Todos os códigos novos têm chave em `errors.*` nos dois locales.
- **Sessões revogáveis:** revogar uma linha em `sessions` ou incrementar `passwordVersion` corta a sessão no pedido seguinte.
- **Invariante:** nunca ficar sem nenhum admin ativo. Um admin não pode desativar-se, apagar-se, nem tirar a si próprio a role `admin`.
- **Palavras-passe:** mínimo de 12 caracteres (`shared/schemas/password.ts`), validado no cliente e no servidor.
- **Handlers:** `requireUser`, depois `assertPermission`, depois `readValidatedBody(zod)`, depois o service, depois `audit`. Os handlers não acedem à DB diretamente, exceto os de leitura trivial.

## Modelo de dados (migração `0001_auth`)

| Tabela | Colunas |
|---|---|
| `users` | `id int PK ai`, `email varchar(191) unique`, `name varchar(120)`, `password_hash varchar(255)`, `roles json` (`Role[]`), `active bool=1`, `must_change_password bool=0`, `password_version int=1`, `locale varchar(10) null`, `theme varchar(32) null`, `last_login_at timestamp null`, `created_at`, `updated_at` |
| `sessions` | `id varchar(36) PK`, `user_id int FK→users cascade`, `ip varchar(64)`, `user_agent varchar(300)`, `created_at`, `last_seen_at`, `expires_at`, `revoked_at null`; índice `(user_id)` |
| `invites` | `id int PK ai`, `token_hash char(64) unique`, `email varchar(191) null`, `roles json`, `created_by int FK→users set null`, `expires_at`, `used_at null`, `created_at` |
| `audit_log` | `id bigint PK ai`, `user_id int null`, `action varchar(64)`, `resource varchar(64)`, `resource_id varchar(64) null`, `meta json null`, `ip varchar(64) null`, `created_at`; índice `(created_at)` |

## Interfaces (nomes fixos para os planos seguintes)

```ts
// shared/permissions.ts
ROLES = ["admin", "editor", "user"] as const; type Role
RESOURCES = ["users", "settings", "audit", "notes"] as const; type Resource   // os módulos acrescentam
type Action = "read" | "create" | "update" | "delete" | "manage"
PERMISSIONS: Record<Role, Partial<Record<Resource, readonly Action[]>>>
can(roles: readonly Role[], resource: Resource, action: Action): boolean   // "manage" implica todas as ações

// shared/schemas/*.ts (zod, usados nos dois lados)
passwordSchema, loginSchema, setupSchema, changePasswordSchema, userCreateSchema,
userUpdateSchema, profileSchema, inviteCreateSchema, inviteAcceptSchema

// shared/settings.ts
SETTINGS: { [key]: { schema: ZodType, default: T, public: boolean } }
type SettingKey = keyof typeof SETTINGS; type SettingValue<K>
// chaves: "security.login" {limit, windowMinutes}, "security.api" {limit, windowSeconds},
//         "appearance.defaultTheme" string, "appearance.userThemes" bool,
//         "i18n.forcedLocale" "pt-PT"|"en-US"|null, "maintenance.enabled" bool, "maintenance.message" string

// shared/types/auth.ts
interface SessionUser { id, name, email, roles: Role[], passwordVersion, mustChangePassword, locale, theme }
interface AuthUser extends SessionUser { effectiveRoles: Role[], mimicking: boolean }

// server/utils
resolveClientIp(event): string                       // respeita runtimeConfig.trustProxy
createRateLimiter({ limit, windowMs }) -> { hit(key, now?) -> { allowed, retryAfterSeconds }, reset(key) }
generatePassword(): string                            // 4 grupos de 4, alfabeto sem ambíguos
constantTimeEqual(a, b): boolean
hashToken(token): string (sha256 hex); newToken(): string (32 bytes base64url)
getSetting(key) / setSetting(key, value, actor) / getPublicSettings() / invalidateSettings()
audit(event, { action, resource, resourceId?, meta? })
createSession(event, user, remember) / revokeSession(id) / revokeUserSessions(userId, exceptSid?)
requireUser(event, opts?: { allowPasswordChange?: boolean }): AuthUser
assertPermission(user: AuthUser, resource, action): void
checkAdminInvariant({ actorId, targetId, targetIsActiveAdmin, next: { active, roles } | "delete", activeAdminCount }): string | null   // devolve o código de erro

// server/services/users.ts   (ctx = { db, actor?: AuthUser })
listUsers, createUser, updateUser, resetUserPassword, deleteUser, countActiveAdmins

// client
useApi(): typeof $fetch      // plugin $api: 401 -> /entrar?redirect, 403 password_change_required -> /conta/password
useSession(): { user, loggedIn, effectiveRoles, refresh, logout }
useCan(): (resource, action) => boolean ;  <Can resource action>
useErrorMessage(): (error) => string   // extractApiError + t(`errors.${code}`) com fallback
definePageMeta({ auth: false | "guest", permission: [Resource, Action] })
```

## Endpoints

| Método e rota | Guard | Notas |
|---|---|---|
| `GET /api/auth/status` | público | `{ needsSetup, setupEnabled }` |
| `POST /api/auth/setup` | público, rate limit | código em tempo constante; transação com recontagem de utilizadores; cria admin e sessão |
| `POST /api/auth/login` | público, rate limit (settings) | 401 genérico com hash fictício; 403 `auth.inactive`; `lastLoginAt` |
| `POST /api/auth/logout` | sessão | revoga a linha, limpa o cookie |
| `GET /api/auth/me` | sessão (permite troca de password) | `AuthUser` |
| `POST/DELETE /api/auth/mimic` | só admin real | `{ roles }` → sessão com `mimicRoles` |
| `PATCH /api/account` | sessão | nome, locale, tema; volta a selar o cookie |
| `POST /api/account/password` | sessão (permite troca) | verifica a atual; `passwordVersion++`; revoga as outras sessões; limpa `mustChange`; volta a selar |
| `GET /api/account/sessions` | sessão | lista com `current` |
| `DELETE /api/account/sessions/:id` | sessão, só as próprias | |
| `GET /api/admin/users` | `users:read` | |
| `POST /api/admin/users` | `users:create` | sem password: gera uma e devolve-a uma vez, com `mustChange` |
| `PATCH /api/admin/users/:id` | `users:update` | invariantes; mudar roles ou active revoga sessões se necessário |
| `POST /api/admin/users/:id/reset-password` | `users:update` | gera password, `passwordVersion++`, revoga sessões |
| `DELETE /api/admin/users/:id` | `users:delete` | invariantes |
| `GET/POST /api/admin/invites`, `DELETE /api/admin/invites/:id` | `users:create` | o POST devolve o token uma vez |
| `GET /api/invites/:token` | público | `{ valid, email }` |
| `POST /api/invites/:token/accept` | público, rate limit | cria o utilizador, marca `used_at`, inicia sessão |
| `GET /api/settings/public` | público | chaves `public: true` + `maintenance.enabled` |
| `GET /api/admin/settings`, `PUT /api/admin/settings/:key` | `settings:manage` | valida com o schema da chave; auditoria |
| `GET /api/admin/audit?page&size&action` | `audit:read` | paginado |

## Middleware do servidor

- `01.session`: se o cookie tem `sid`, valida a linha em `sessions` e o utilizador. Falha se:
  - a sessão está revogada ou expirada;
  - o utilizador está inativo;
  - o `passwordVersion` difere.

  Nesses casos, `clearUserSession`. Caso contrário, põe `event.context.auth = { user: AuthUser, sid }` e atualiza `lastSeenAt` no máximo 1×/min.
- `02.maintenance`: com `maintenance.enabled` e um utilizador que não é admin, as rotas `/api/**` (exceto auth, health e settings públicos) respondem 503 `system.maintenance`. As páginas redirecionam para `/manutencao` (o middleware de rota trata disso com os settings públicos).
- `03.rate-limit`: limite global por IP em `/api/**`, a partir de `security.api`; responde 429 `system.rate_limited` com `Retry-After`.

## Tasks

### Task 1: Permissões, schemas e settings partilhados (puro)
- **Criar:** `shared/permissions.ts`, `shared/schemas/{password,auth,users,account,invites}.ts`, `shared/settings.ts`, `shared/types/auth.ts`.
- **Testes** em `test/unit/permissions.test.ts`:
  - admin pode tudo;
  - editor: `notes` CRUD mas não `users`;
  - user: só `notes:read`;
  - `manage` implica as outras ações;
  - várias roles fazem união;
  - roles vazias não permitem nada;
  - todas as roles em `ROLES` têm entrada.
- **Testes** em `test/unit/schemas.test.ts`:
  - password com 11 caracteres falha e com 12 passa;
  - o email é normalizado (trim + lowercase);
  - `userCreate` rejeita uma role desconhecida;
  - os defaults dos settings passam os próprios schemas.

### Task 2: Utilitários do servidor (puro)
- **Criar:** `server/utils/{rateLimiter,password,tokens,clientIp,adminInvariant}.ts`.
- **Testes** do rate limiter:
  - permite até ao limite e bloqueia a seguir;
  - `retryAfter` fica certo;
  - a janela reinicia com `now` injetado;
  - `reset` funciona.
- **Testes** de `generatePassword`: formato `xxxx-xxxx-xxxx-xxxx`, alfabeto sem ambíguos, 1000 gerações sem duplicados.
- **Testes** de `constantTimeEqual`: comprimentos diferentes dão false.
- **Testes** de `hashToken`: determinista, 64 hex.
- **Testes** do invariante: não desativar o último admin; não remover a role admin do último; não se autodesativar; não se autoapagar; não tirar a si próprio o admin; um caso válido devolve `null`.

### Task 3: Schema da DB, migração 0001 e auth.d.ts
- **Criar:** `server/db/schema/{users,sessions,invites,audit}.ts` (re-exportados), `auth.d.ts` (`User = SessionUser`, `UserSession { sid?, remember?, mimicRoles? }`).
- Instalar `nuxt-auth-utils` e juntar o módulo à config, com `runtimeConfig.session = { maxAge: 30 dias, cookie: { sameSite: "lax" } }`, `runtimeConfig.setupCode` e `runtimeConfig.trustProxy`.
- `npm run db:generate -- --name auth`, rever o SQL, `npm run check`.

### Task 4: Settings e auditoria (servidor)
- **Criar:** `server/utils/settings.ts` (cache de 30 s, validação por chave, `setSetting` audita), `server/utils/audit.ts`, as rotas de settings (públicas e admin) e `GET /api/admin/audit`.

### Task 5: Sessões, login, logout, setup, me
- **Criar:** `server/utils/session.ts`, `server/utils/auth.ts` (`requireUser`, `assertPermission`), `server/middleware/01.session.ts`, `02.maintenance.ts`, `03.rate-limit.ts` e as rotas `auth/*`.

### Task 6: Conta e administração de utilizadores e convites
- **Criar:** `server/services/users.ts`, `server/services/invites.ts`, as rotas `account/*`, `admin/users/*`, `admin/invites/*` e `invites/*`.

### Task 7: Testes de API (e2e contra MySQL)
- **Criar:** `vitest.config.ts` com dois projetos:
  - `unit`: `test/unit`;
  - `api`: `test/api`, com `globalSetup` que recria a DB `<db>_test`, aplica as migrações via `drizzle-orm/mysql2/migrator` e define as variáveis.
- **Criar:** `test/api/setup.ts`, `test/api/helpers.ts` (cliente com cookie jar) e `test/api/auth.test.ts`. Casos:
  1. `status` devolve `needsSetup: true`.
  2. Setup com código errado dá 403; com o certo dá 200 e fica com sessão.
  3. Segundo setup dá 409 `auth.setup_done`.
  4. `me` devolve o admin.
  5. Login com password errada dá 401; com email inexistente também 401, com o mesmo código.
  6. Admin cria um utilizador sem password: recebe a password gerada e o utilizador tem `mustChange`.
  7. O novo utilizador faz login; `GET /api/admin/users` dá 403 `auth.forbidden`; `PATCH /api/account` é bloqueado com 403 `auth.password_change_required` até mudar a password.
  8. Mudar a password: a sessão antiga (outro jar) passa a 401.
  9. Admin desativa o utilizador: o pedido seguinte dele dá 401.
  10. Não se pode desativar o último admin (409 `users.last_admin`).
  11. Revogar uma sessão pela conta dá 401 nesse jar.
  12. Convite: criar, `GET` válido, aceitar, login, e reutilizar o token dá 410.
  13. Manutenção ligada: o user recebe 503 e o admin 200.
  14. Rate limit do login: o pedido `limit+1` dá 429.
  15. Settings: um `PUT` inválido dá 400 e a auditoria regista `settings.update`.
- **Scripts:** `test` passa a correr só o projeto unit (é o que o `check` usa); `test:api` corre o `api` e precisa do `docker compose up -d db`.

### Task 8: Cliente — plumbing
- **Criar:**
  - `app/plugins/api.ts` e `app/composables/useApi.ts`;
  - `app/composables/useSession.ts`, `useCan.ts` e `useErrorMessage.ts`;
  - `app/components/app/Can.vue`;
  - `app/middleware/auth.global.ts`, com esta ordem: settings públicos (manutenção) → setup necessário → guest → auth → troca de password obrigatória → permissão;
  - `app/plugins/locale.ts`, que aplica o locale forçado pelo admin, depois a preferência do utilizador, depois a cookie ou browser (spec §13).
- `index.vue` recebe `definePageMeta({ auth: false })`.
- **Testes unitários:** a função pura `resolveRoute(state, to)` extraída do middleware, com as regras de encaminhamento cobertas caso a caso.

### Task 9: Cliente — páginas de autenticação (mínimas; o plano 4 dá-lhes layout final)
- **shadcn:** acrescentar `input`, `label`, `card`, `checkbox` e `alert` via CLI e mover para `app/components/ui` se preciso.
- **Criar:**
  - `layouts/auth.vue`;
  - as páginas `/entrar`, `/setup`, `/convite/[token]`, `/conta/password`, `/manutencao` e `/app` (placeholder com nome, roles e logout);
  - as chaves i18n `auth.*`, `account.*`, `errors.*` e `maintenance.*`.
- **Verificar no browser:** setup, logout, login, troca de password obrigatória e manutenção; consola sem erros.

### Task 10: Documentação e seed
- `entrypoint.sh` corre `scripts/seed.mjs` depois do migrate. O script cria o primeiro admin quando `SEED_ADMIN_EMAIL` e `SEED_ADMIN_PASSWORD` estão definidos e a tabela `users` está vazia. O hash usa `@adonisjs/hash` (driver Scrypt), a mesma biblioteca e os mesmos defaults do `hashPassword` do nuxt-auth-utils; o `@adonisjs/hash` passa a ser dependência direta. Um teste unitário verifica que um hash feito pelo script é aceite pelo `Hash.verify` com os defaults.
- Atualizar o README e o CLAUDE.md do template com o modelo de auth, a matriz, as rotas e os comandos `test:api`.
