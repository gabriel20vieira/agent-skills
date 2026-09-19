# nuxt-base

## Commands
- `npm run dev` — dev server (loads .env)
- `npm run check` — lint + typecheck + unit tests; must pass before commit
- `npm run db:generate -- --name x` — new migration from schema; review the SQL
- `npm run db:migrate` — apply migrations (baseline-aware)
- `docker compose up -d --build` — full stack

## Layout
- `app/` pages, layouts, components (`ui/` = shadcn, generated; `app/` = foundation)
- `server/api/<resource>/` thin handlers; `server/services/` logic; `server/db/schema/<domain>.ts`
- `shared/` pure code used by both sides (tested in `test/unit`)

## Rules
- Errors: `throw fail(status, "domain.code")`; client reads them with `extractApiError`.
- User-facing text only via i18n keys, added to BOTH `i18n/locales/*.json` (a test checks parity).
- Style: 4 spaces, double quotes, no semicolons (`npm run lint:fix`).
- Never `drizzle-kit push` on a real database. Never commit `.env` or `backups/`.

## Gotchas
- Plain `nuxt dev` does not read `.env`; use `npm run dev`.
- `.sh` and migration `.sql` files must stay LF (see `.gitattributes`).
- Never render from `colorMode.value` in a template: the server cannot know it and
  hydration mismatches. Style with the `dark:` variant; read the mode only in handlers.
- `h3` is pinned to ^1 at the root on purpose: `@nuxt/eslint` pulls h3 v2, which would
  hoist over Nitro's v1 and break server types. Import `h3` only where tests need it.
- `vue-router` must match Nuxt's major (5); a v4 pin breaks `nuxt typecheck`.
- shadcn-vue CLI may write to `./components`; move new components to `app/components/ui/`.
- Stopping `npm run dev` from a tool can orphan the node child on Windows; free port 3000
  with `Get-NetTCPConnection -LocalPort 3000 | % { Stop-Process -Id $_.OwningProcess }`.
