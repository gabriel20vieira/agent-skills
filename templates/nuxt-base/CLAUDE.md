# nuxt-base

## Commands
- `npm run dev` — dev server (loads .env)
- `npm run check` — lint + typecheck + unit tests; must pass before commit (`checks.beforeCommit`)
- `npm run test:api` — API tests against a fresh MySQL `<db>_test` (needs `docker compose up -d db`)
- `npm run db:generate -- --name x` — new migration from schema; review the SQL
- `npm run db:migrate` — apply migrations (baseline-aware)
- `docker compose up -d --build` — full stack

## Layout
- `app/` pages, layouts, components (`ui/` = shadcn, generated; `app/` = foundation)
- `server/api/<resource>/` thin handlers; `server/services/` logic; `server/db/schema/<domain>.ts`
- `shared/` pure code used by both sides (tested in `test/unit`); import it as `#shared/...`

## Rules
- Working preferences (base branch, git cleanup, merge method, who pushes, checks before
  commit, docs language, installed modules, dev-crew models and limits) are in
  `docs/settings.md`. Follow them; when a value is empty, ask once and write the answer there.
- Handler order: `requireUser(event)` → `assertPermission(user, resource, action)` →
  `readBodyWith(event, schema)` → service → `audit(event, ...)`.
- Permissions live only in `shared/utils/permissions.ts`; new resources are added to
  `RESOURCES` and `PERMISSIONS`. Pages declare `definePageMeta({ permission: [r, a] })`.
- Errors: `throw fail(status, "domain.code")`; every code needs `errors.<domain>.<code>` in
  BOTH locales. Client: `useErrorMessage()(error)` or `useSubmit()`.
- Runtime-editable config goes in `shared/utils/settings.ts` (schema + default + public flag).
- Realtime: services call `realtime.publish(resourceTopic(r), "<r>.created|updated|deleted", { id })`
  after the write; pages use `useLiveResource(r, refresh)`. Payloads are ids only.
- UI: a new resource page copies `app/pages/app/notes.vue` (DataTable + ResponsiveDialog +
  useZodForm + useConfirm + useLiveResource) and gets an entry in `app/utils/navigation.ts`.
  Destructive actions always go through `useConfirm()`; secrets shown once through `useSecretDialog()`.
- Pages have a single root element (lint rule); foundation components need no import.
- User-facing text only via i18n keys, added to BOTH `i18n/locales/*.json` (a test checks parity).
- Style: 4 spaces, double quotes, no semicolons (`npm run lint:fix`).
- Never `drizzle-kit push` on a real database. Never commit `.env` or `backups/`.

## Gotchas
- Plain `nuxt dev` does not read `.env`; use `npm run dev`.
- Import shared code as `#shared/...`, never `../../shared/...`: relative imports from
  `app/` resolve one level off in the Linux SSR build.
- In pages use `useApi()` (url typed as string), not `$fetch("/api/...")`: Nuxt's typed
  routes blow the TS stack ("Excessive stack depth") with many API routes.
- Session typings (`#auth-utils`, `H3EventContext.auth`) are in `shared/types/session.d.ts`;
  a root `auth.d.ts` is not picked up by the server tsconfig.
- `.sh` and migration `.sql` files must stay LF (see `.gitattributes`).
- Dates: always `d(new Date(x), "long")` with the i18n formats, which pin
  `NUXT_PUBLIC_TIMEZONE`. Never `toLocaleString()` in a template: the server's zone is not
  the visitor's and hydration breaks.
- Never render from `colorMode.value` in a template: the server cannot know it and
  hydration mismatches. Style with the `dark:` variant; read the mode only in handlers.
- `h3` is pinned to ^1 at the root on purpose: `@nuxt/eslint` pulls h3 v2, which would
  hoist over Nitro's v1 and break server types.
- `vue-router` must match Nuxt's major (5); a v4 pin breaks `nuxt typecheck`.
- `npx shadcn-vue@latest add <name> --yes` writes to `app/components/ui/` as configured.
- Stopping `npm run dev` from a tool can orphan the node child on Windows; free port 3000
  with `Get-NetTCPConnection -LocalPort 3000 | % { Stop-Process -Id $_.OwningProcess }`.
