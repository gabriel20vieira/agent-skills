# claude-skills

A Claude Code plugin marketplace with two plugins, installed separately:

| Plugin | What it is |
|---|---|
| `web-foundation` | Build websites quickly on one consistent Nuxt 4 base (this page) |
| `dev-crew` | A crew of subagents (Opus coordinates, Sonnet develops, Haiku checks) with a live dashboard; see `plugins/dev-crew/README.md` |

```bash
claude plugin marketplace add <path-or-git-url-of-this-repo>
claude plugin install web-foundation@claude-skills
claude plugin install dev-crew@claude-skills
```

## web-foundation

- `templates/nuxt-base/` — runnable Nuxt 4 app with the core: accounts with revocable
  sessions, roles and a shared permission matrix, realtime over WebSocket, dialogs and
  confirmations, themes, i18n (pt-PT/en-US), settings, audit log, MySQL migrations, Docker
  and no-Docker deploy, unit and API tests.
- `skills/` — skills that scaffold a project from the template and extend it.
- `modules/` — optional features (assistant, PWA, tenancy, public site) applied by skills.
- `docs/superpowers/` — design specs and implementation plans (both plugins).

After installing, ask Claude for what you want ("start a new site called parish-site", "add a
products resource", "deploy this with Caddy"); the matching skill loads by itself.

## Skills

| Skill | Use it to |
|---|---|
| `web-foundation` | learn the architecture and rules; routes to the other skills |
| `web-new-project` | copy the template into a new project with fresh secrets |
| `web-crud-resource` | add an entity end to end (table, API, permissions, page, tests) |
| `web-realtime-event` | push a server change to open tabs |
| `web-theme` | add a colour theme (tweakcn or any shadcn tokens) |
| `web-deploy` | Docker or plain Node, proxy, backups, go-live checklist |
| `web-audit` | security review before going live |
| `web-assistant` / `web-assistant-tool` | chat assistant with permission-aware tools |
| `web-pwa` | installable app with an offline page |
| `web-tenancy` | organisations and per-organisation data |
| `web-public-site` | public pages, SEO, sitemap, robots, llms.txt, cookie notice |

## Work on this repo

```bash
cd templates/nuxt-base
npm install
docker compose up -d db
npm run check          # lint + typecheck + unit tests
npm run test:api       # builds and runs API/realtime tests against <db>_test
```

Skill scripts have their own tests (both plugins):

```bash
node --test skills/*/scripts/*.test.mjs plugins/*/skills/*/scripts/*.test.mjs plugins/*/dashboard/*.test.mjs
```
See `templates/nuxt-base/README.md` for running the template.
