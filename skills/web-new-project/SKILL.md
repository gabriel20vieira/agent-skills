---
name: web-new-project
description: Use when starting a new website or web app from the web-foundation Nuxt template - copies templates/nuxt-base into a new folder, renames it, generates secrets and .env, and brings it up with the database, migrations and checks passing.
---

# New project from the template

Creates a working project from `templates/nuxt-base` (Nuxt 4, MySQL, auth, roles,
realtime, dialogs, themes, i18n, Docker). Read `web-foundation` for the conventions
afterwards.

Template path: `${CLAUDE_PLUGIN_ROOT}/templates/nuxt-base` when installed as a plugin,
`templates/nuxt-base` inside the agent-skills repo.

## Ask only what you cannot default

- Folder (required). The package name defaults to the folder name (kebab-case).
- Display name (defaults to the folder name in title case).
- Default language: `pt-PT` (default) or `en-US`.
- Host ports only if something already uses 3000/3306/4000 on this machine.

## Steps

1. Copy and personalise (never overwrites a non-empty folder):

   ```bash
   node "${CLAUDE_PLUGIN_ROOT}/skills/web-new-project/scripts/new-project.mjs" \
       --dest ../my-site --title "My Site" [--name my-site] [--locale en-US]
   ```

   It skips `node_modules`, build output, `.data`, `backups` and `.env`; replaces
   `nuxt-base`/`Nuxt Base` everywhere (package, compose project, systemd unit, docs);
   writes `.env` with fresh `NUXT_SESSION_PASSWORD`, `NUXT_SETUP_CODE` and MySQL passwords
   (keeping `DATABASE_URL` in sync). It prints the setup code: give it to the user.
2. If ports clash, edit `APP_PORT`, `DB_PORT`, `PMA_PORT` and the port in `DATABASE_URL`
   in `.env`.
3. In the new folder:

   ```bash
   git init
   npm install
   docker compose up -d db
   npm run db:migrate
   npm run check
   ```

4. `npm run dev`, open `http://localhost:3000/setup` and create the first admin with the
   setup code (or set `SEED_ADMIN_*` in `.env` before starting).
5. Replace the landing page (`app/pages/index.vue`), `home.*` texts in both locales and
   `app/pages/privacidade.vue` with the project's own. Update the project `README.md`
   heading paragraph.
6. Remove the `notes` example only when the first real resource exists (it is the model
   `web-crud-resource` copies): delete its schema, service, API, page, navigation entry,
   permission entries, i18n keys and test, then `npm run db:generate -- --name drop_notes`.
7. First commit: `git add -A && git commit -m "chore: start from web-foundation template"`.
   Check `git status` first: `.env` must not be staged.

## Without Docker

Point `DATABASE_URL` at any MySQL 8.4 and skip `docker compose up -d db`. Everything else
is the same. See `web-deploy` for production.

## Done when

- `npm run check` passes in the new folder.
- `/setup` creates an admin, `/app` loads without a "reconnecting" badge.
- `.env` is untracked.
