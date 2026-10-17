---
name: web-foundation
description: Use when working on any project built from the web-foundation Nuxt template (Nuxt 4 + MySQL/Drizzle + nuxt-auth-utils + shadcn-vue, with server/services, shared/utils/permissions.ts and a /_ws realtime hub) - explains the architecture, the rules every change must follow and which web-* skill to use for each kind of change.
---

# Web foundation: architecture and rules

The template (`templates/nuxt-base`, or the project itself) is the source of truth. Read
its `CLAUDE.md` first; this skill explains the why and routes to the other skills.

## Architecture

One Nuxt 4 app (Nitro `node-server`), one MySQL 8.4 database, one port.

```
app/          pages (pt-PT routes: /entrar, /conta, /admin/...), layouts, components
  components/ui/    shadcn-vue (generated, do not edit by hand)
  components/app/   foundation components, used without prefix
  composables/      useApi, useSession, useCan, useZodForm, useConfirm, useNotify, useRealtime...
server/
  api/<resource>/   thin handlers
  services/         business logic, audit, realtime publish
  db/schema/        drizzle tables, one file per domain; drizzle/ = versioned migrations
  utils/            fail, validate, auth, session, settings, audit, realtime, rate limiter
  middleware/       01 session, 02 maintenance, 03 rate limit, 04 no-store
  routes/_ws.ts     WebSocket endpoint (same port)
shared/           pure code for both sides: permissions, settings, schemas, themes, protocol
i18n/locales/     pt-PT.json, en-US.json (key parity is tested)
test/unit, test/api
```

## Rules (each exists because a previous project broke it)

- **Handlers**: `requireUser(event)` → `assertPermission(user, resource, action)` →
  `readBodyWith(event, schema)` → service. No SQL in handlers.
- **Permissions**: only in `shared/utils/permissions.ts` (`RESOURCES` × `ACTIONS` per role;
  `manage` = everything). Server `assertPermission`, client `useCan()`, `<Can>`,
  `definePageMeta({ permission: [resource, action] })`, navigation entries. Never check a
  role name directly.
- **Errors**: `throw fail(status, "domain.code", message?, extra?)`. Every code has
  `errors.domain.code` in both locales. The client shows them with `useErrorMessage`,
  `useSubmit`, `useZodForm` or `useNotify().error(error)`.
- **Validation**: zod schemas in `shared/schemas/`, used by the handler
  (`readBodyWith`) and the form (`useZodForm`) alike.
- **Sessions**: a sealed cookie plus a `sessions` row checked on every request. Revoking
  (logout, password change, deactivation, admin reset) is immediate and also closes the
  user's sockets.
- **Settings** editable at runtime: `shared/utils/settings.ts` (zod schema, default,
  `public` flag). Never add an env var for something an admin should change.
- **Audit** every write in the service: `audit(event, { action: "notes.update", resource, resourceId })`.
- **Realtime**: publish after commit with ids only; clients refetch through REST, so
  permissions are always the REST ones.
- **UI**: destructive actions through `useConfirm()`; secrets shown once through
  `useSecretDialog()`; toasts through `useNotify()`; dialogs through `<ResponsiveDialog>`.
  No `window.confirm`, no inline "are you sure" states.
- **Text**: all user-facing text via i18n keys in both locales. Code and comments in English.
- **Style**: 4 spaces, double quotes, no semicolons. `npm run lint:fix`.
- **Imports**: shared code as `#shared/...`; in pages call the API with `useApi()`.
- **Database**: change `server/db/schema`, then `npm run db:generate -- --name x` and review
  the SQL. Never `drizzle-kit push` on a real database.
- **Checks**: the commands in `checks.beforeCommit` must pass before every commit (template
  default: `npm run check`, plus `npm run test:api` when server code changed).
- **Project settings**: `docs/settings.md` holds the working preferences (a table of
  setting, value, options). Read it before acting on any of them. An empty value means
  nobody decided yet: ask the user once (AskUserQuestion with the listed options), write the
  answer in the table and commit it with the work. `ask` means ask every time. A project
  without the file gets it from `templates/nuxt-base/docs/settings.md`. Settings:
  `git.baseBranch`, `git.deleteMergedBranches`, `git.mergeMethod`, `git.pushAndPr`,
  `checks.beforeCommit`, `docs.language`, `modules.installed`, `crew.limits`,
  `crew.dashboardUrl`.
- **Git**: start work from `git.baseBranch` and target it with PRs. When a branch is merged (PR or local), follow `git.deleteMergedBranches`. With
  `yes`, delete it locally and on `origin` (`git branch -d`, `git push origin --delete`, or
  `gh pr merge --delete-branch`) and remove its worktree (`git worktree remove`, then
  `git fetch --prune`). With `no`, keep them. Empty or `ask`: ask. Never delete a branch
  with unmerged commits or a worktree with uncommitted files. Merge with `git.mergeMethod`;
  push and open PRs only when `git.pushAndPr` is `agent` (or the user asks).

## Which skill

| Change | Skill |
|---|---|
| New project | `web-new-project` |
| New entity with list/create/edit/delete | `web-crud-resource` |
| Push a change to open tabs | `web-realtime-event` |
| New colour theme | `web-theme` |
| Production, proxy, backups, no-Docker hosting | `web-deploy` |
| Security review before going live | `web-audit` |
| Chat assistant with tools | `web-assistant`, then `web-assistant-tool` |
| Installable app / offline page | `web-pwa` |
| Organisations (multi-tenant) | `web-tenancy` |
| Public pages, SEO, sitemap | `web-public-site` |

## Modules

Optional features live in `modules/<name>/` of the plugin. Each module skill starts with

```bash
node "${CLAUDE_PLUGIN_ROOT}/skills/web-foundation/scripts/apply-module.mjs" <name> .
```

which copies the module's new files (never overwriting) and merges its i18n keys (never
overwriting), adds the module to `modules.installed` in `docs/settings.md`, then lists the
few core edits to make by hand. Read `modules.installed` before applying one, to see what
the project already has. Apply modules to a clean
working tree so `git diff` shows exactly what each one changed.

## Out of scope

Other stacks, other databases, payments, transactional email and OAuth are not in the
foundation. Add them as project code following the rules above.
