# nuxt-base

Nuxt 4 full-stack foundation: Tailwind v4 + shadcn-vue, i18n (pt-PT/en-US), dark mode,
MySQL 8.4 + Drizzle migrations, accounts with revocable sessions, a shared permission
matrix, DB-backed settings, audit log, maintenance mode and rate limits.

## Quick start (Docker)

```bash
cp .env.example .env
# delete the empty NUXT_SESSION_PASSWORD= / NUXT_SETUP_CODE= lines, then:
pwsh ./scripts/gen-secrets.ps1 >> .env     # or: sh ./scripts/gen-secrets.sh >> .env
docker compose up -d --build
curl http://localhost:3000/api/health
```

phpMyAdmin: `docker compose --profile tools up -d phpmyadmin` → http://localhost:4000

Run several projects side by side by changing `COMPOSE_PROJECT_NAME`, `APP_PORT`,
`DB_PORT` and `PMA_PORT` in `.env`.

## Without Docker

Needs Node 24 and a MySQL 8.4 (the compose `db` service works: `docker compose up -d db`).

```bash
npm install
npm run db:migrate
npm run dev                 # http://localhost:3000
# production
npm run build && npm run start
```

`deploy/nuxt-base.service` is a systemd unit; on Windows wrap `npm run start` with NSSM.

## Database changes

1. Edit `server/db/schema/<domain>.ts` (export it from `schema/index.ts`).
2. `npm run db:generate -- --name <what-changed>` and **read the generated SQL**.
3. Commit the migration. The container applies it on boot; without Docker run `npm run db:migrate`.

Never run `drizzle-kit push` against a real database. If a database was created with
`push`, the boot step `scripts/baseline-migrations.mjs` adopts it (records `0000` as
applied) when its tables match, and refuses otherwise.

## Operations

- Backup: `pwsh ./scripts/backup.ps1` (or `sh ./scripts/backup.sh`) → `backups/` (git-ignored).
- Clean this project's Docker resources: `pwsh ./scripts/docker-clean.ps1 [-Images] [-Volumes] [-All]`.
- Reverse proxy examples: `deploy/Caddyfile`, `deploy/nginx.conf`.
- Public URL for SEO links: `NUXT_PUBLIC_I18N_BASE_URL=https://example.com`.

## Accounts and permissions

- **First admin**: open the app → `/setup`, enter `NUXT_SETUP_CODE`. Or set
  `SEED_ADMIN_EMAIL`/`SEED_ADMIN_PASSWORD` and the container creates it on first boot.
- **Sessions**: sealed cookie + a row in `sessions`, checked on every request. Revoking a
  row, deactivating a user or changing a password takes effect on the next request.
  "Remember me" = 30 days, otherwise 1 day.
- **Roles** (`admin`, `editor`, `user`) map to actions per resource in
  `shared/utils/permissions.ts`. The server enforces it (`assertPermission`); the client
  reads the same matrix (`useCan`, `<Can>`, `definePageMeta({ permission })`).
- Admins create users (a generated password must be changed at first login) or send
  invites (`/convite/<token>`). The last active admin cannot be removed.
- **Settings** (`shared/utils/settings.ts`): DB value > default, edited through
  `/api/admin/settings/<key>`; login/API rate limits, maintenance, default theme, forced locale.
- **Audit**: `audit(event, { action, resource, ... })` → `/api/admin/audit`.

## Checks

- `npm run check` = lint + typecheck + unit tests.
- `npm run test:api` = builds the app and runs the API tests against a fresh
  `<database>_test` (needs `docker compose up -d db` and `MYSQL_ROOT_PASSWORD` in `.env`).
