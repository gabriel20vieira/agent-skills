---
name: web-tenancy
description: Use when a project built from the web-foundation Nuxt template needs organisations/teams/workspaces (multi-tenant) - users in several organisations with per-organisation roles, an organisation switcher, and data scoped to the active organisation.
---

# Tenancy module

Installs `modules/tenancy` (file list in its README). Two layers of permission:
- the **global matrix** (`shared/utils/permissions.ts`) - what someone may do in the app
  at all (e.g. create organisations, admin screens);
- the **organisation role** (`shared/utils/tenancy.ts`) - what they may do inside one
  organisation (`read`, `write`, `manage_members`, `manage_org`, `delete_org`).

## Install

1. Copy the files and merge the texts:

   ```bash
   node "${CLAUDE_PLUGIN_ROOT}/skills/web-foundation/scripts/apply-module.mjs" tenancy .
   ```

2. `server/db/schema/index.ts`: `export * from "./organizations"`.
3. `shared/utils/permissions.ts`: add `"organizations"` to `RESOURCES`; in `PERMISSIONS`
   give `admin` `organizations: ALL` and every role that may create organisations
   `organizations: ["create"]` (default: `editor` and `user`).
4. `app/utils/navigation.ts`: in the main group,
   `{ to: "/app/organizacoes", labelKey: "nav.organizations", icon: Building2Icon }`
   (import `Building2Icon` from `@lucide/vue`).
5. `app/components/app/AppSidebar.vue`: `<OrgSwitcher />` inside `<SidebarHeader>`, below
   the app name.
6. Migration: `npm run db:generate -- --name tenancy`, read the SQL, `npm run db:migrate`.

## Scope a resource to the organisation

For each org-owned resource (use `web-crud-resource` first, then):

1. Table: `orgId: int("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" })`
   plus an index on it. Regenerate the migration.
2. Handlers: start with `const m = await requireMembership(event)` (active organisation) and
   `assertOrgPermission(m, "read" | "write")`. Keep `assertPermission` too if the global
   role should also gate it.
3. Service: every query filters `eq(table.orgId, m.org.id)`, including `get`/`update`/
   `delete` by id (`and(eq(table.id, id), eq(table.orgId, m.org.id))`), so an id from
   another organisation is a 404. Inserts set `orgId: m.org.id`.
4. Realtime: `await publishToOrg(m.org.id, "products.updated", { id })` instead of
   `realtime.publish(resourceTopic(...))`; the page uses
   `useLiveOrgResource("products", refresh)` instead of `useLiveResource`.
5. The page's `useAsyncData` key includes the org id or uses `watch: [() => active.value?.id]`
   (switching calls `refreshNuxtData()` anyway).
6. API test: a member of another organisation gets `orgs.not_found` for list, get,
   update and delete.

## Rules

- Never trust an `orgId` from the body or query for authorisation; take it from
  `requireMembership` (route param or the active-organisation cookie).
- Not-a-member is 404 (`orgs.not_found`), never 403: ids must not reveal other tenants.
- An organisation always keeps one owner; only owners make or unmake owners.
- Deleting an organisation cascades to its rows; say so in the confirmation text.

## Verify

```bash
npm run check
npm run test:api
```

Browser: create two organisations, switch between them in the sidebar, add a second
user as member and watch their switcher update live, remove them and check their access
is gone without a reload.
