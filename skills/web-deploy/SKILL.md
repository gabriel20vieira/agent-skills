---
name: web-deploy
description: Use when putting a project built from the web-foundation Nuxt template into production or staging - Docker Compose or plain Node (systemd/NSSM), reverse proxy with WebSocket and streaming, secrets, migrations on boot, backups and the go-live checklist.
---

# Deploy

The app is one Node process (`.output/server/index.mjs`) plus MySQL 8.4. HTTP, the
WebSocket (`/_ws`) and streaming responses share one port. Migrations are versioned SQL in
`drizzle/`, applied at boot (Docker) or by `npm run db:migrate` (no Docker).

## Choose

- **Docker Compose** (default): one host, app + db (+ phpMyAdmin behind the `tools`
  profile). Boot runs wait-for-db → baseline → migrate → seed → server.
- **Plain Node**: an existing MySQL, a managed database, or a host without Docker.

Either way: exactly **one app instance** (the realtime hub and the rate limiter live in
memory). Scale vertically.

## Docker Compose

1. On the server: clone the project, `cp .env.example .env`, then fill it. Generate the
   two app secrets with `sh ./scripts/gen-secrets.sh` and paste them; use long random
   values for `MYSQL_ROOT_PASSWORD` and `MYSQL_PASSWORD` (keep `DATABASE_URL` in sync).
2. Production values in `.env`:
   - `NUXT_PUBLIC_I18N_BASE_URL=https://<domain>` (canonical/SEO links);
   - `NUXT_TRUST_PROXY=true` **only** when the proxy below is the only way in;
   - `APP_PORT` bound to localhost if the proxy is on the same host (edit the compose
     `ports` to `"127.0.0.1:${APP_PORT:-3000}:3000"`); `db` and `phpmyadmin` are already
     bound to `127.0.0.1` - keep it that way (reach phpMyAdmin through an SSH tunnel);
   - `SEED_ADMIN_*` for the first admin, or leave empty and use `/setup` with
     `NUXT_SETUP_CODE`. Clear `NUXT_SETUP_CODE` after the first admin exists.
3. `docker compose up -d --build`, then `curl -fsS http://127.0.0.1:<APP_PORT>/api/health`.
4. Update: `git pull && docker compose up -d --build` (migrations run on boot; take a
   backup first).

## Plain Node

1. Node 24, a MySQL 8.4 database and user. `.env` as above with `DATABASE_URL` pointing
   at it (`NODE_ENV=production`, `PORT` if not 3000).
2. `npm ci && npm run build && npm run db:migrate && npm run start`
   (`start` reads `.env` via `node --env-file-if-exists`).
3. Service: `deploy/<name>.service` (systemd; runs `db:migrate` before start) or, on
   Windows, NSSM wrapping `npm run start` with the project folder as working directory.
4. Update: `git pull && npm ci && npm run build && systemctl restart <name>`.

## Reverse proxy

Examples in `deploy/`:
- `Caddyfile`: automatic HTTPS, WebSocket works by default, `flush_interval -1` for
  streaming.
- `nginx.conf`: must forward `Upgrade`/`Connection` for `/_ws`, set
  `X-Forwarded-For`/`X-Forwarded-Proto`, `proxy_buffering off` and a long
  `proxy_read_timeout`.

After setting it up, check `/app` shows no "reconnecting" badge and
`/api/health` shows `realtime.peers` ≥ 1 with a tab open.

## Backups

- Docker: `sh ./scripts/backup.sh` (or `pwsh ./scripts/backup.ps1`) dumps to `backups/`
  (git-ignored). Schedule it with cron / Task Scheduler and copy the files off the host.
- Plain Node: `mysqldump --single-transaction --routines --triggers <db> > backup.sql`.
- Restore command is in the header of `scripts/backup.sh`. Test a restore once before
  going live.

## Go-live checklist

- [ ] `NUXT_SESSION_PASSWORD` is new for this environment (≥ 32 chars) and not in git.
- [ ] Database not reachable from the internet; app port only through the proxy.
- [ ] HTTPS works; HTTP redirects to HTTPS.
- [ ] `NUXT_TRUST_PROXY` matches reality (true only behind your own proxy).
- [ ] First admin created, `NUXT_SETUP_CODE` cleared, `SEED_ADMIN_PASSWORD` removed.
- [ ] `/api/health` 200; realtime connects through the proxy (no "reconnecting" badge).
- [ ] A backup was taken and restored somewhere else once.
- [ ] Rate limits in `/admin/definicoes` fit the expected traffic.
- [ ] Run the `web-audit` skill.

## Troubleshooting

- The "reconnecting" badge never goes away behind a proxy: the upgrade headers are not forwarded.
- Everyone logged out after deploy: `NUXT_SESSION_PASSWORD` changed.
- Boot fails at baseline: the database has tables that do not match `0000`; see the
  "Database changes" section of the project README.
- `.sh` fails in the container with `\r`: the file was checked out with CRLF; the repo's
  `.gitattributes` must keep `*.sh eol=lf`.
