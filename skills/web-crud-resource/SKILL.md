---
name: web-crud-resource
description: Use when adding a new entity (table + API + page) with list/create/edit/delete to a project built from the web-foundation Nuxt template - follows the notes reference resource end to end, including permissions, audit, realtime, i18n and API tests.
---

# Add a CRUD resource

The `notes` resource is the model. Copy its files, rename, then adapt the fields. Every
step below has a `notes` counterpart; open it side by side instead of writing from memory.

Names used below: resource `products` (plural, lower case, used in the API, permissions,
topics, i18n and audit), row type `Product`, page route in Portuguese if the project's
routes are (`/app/produtos`).

## Before starting, decide

- Fields, required ones and limits (they become the zod schema and the columns).
- Who can do what, per role (`admin` already has `manage` on everything).
- Whether the list is small enough for client-side paging (default) or needs server paging
  (see `app/pages/admin/auditoria.vue` + `server/api/admin/audit.get.ts`).

## Steps

1. **Table** `server/db/schema/products.ts` (copy `notes.ts`): `int id autoincrement`,
   `created_at`/`updated_at` with `defaultNow()`/`onUpdateNow()`, foreign keys with an explicit
   `onDelete`, indexes for what the list sorts or filters by. Export it from
   `server/db/schema/index.ts`.
2. **Migration**: `npm run db:generate -- --name products`, read the SQL in `drizzle/`,
   then `npm run db:migrate`. Never edit an applied migration; add a new one.
3. **Schemas** `shared/schemas/products.ts` (copy `notes.ts`): `productCreateSchema`,
   `productUpdateSchema = productCreateSchema.partial()`, and exported input types. Limits
   match the columns.
4. **Permissions** `shared/utils/permissions.ts`: add `"products"` to `RESOURCES`, and the
   actions per role to `PERMISSIONS`. The unit test of the matrix must still pass; add a
   case for the new resource.
5. **Service** `server/services/products.ts` (copy `notes.ts`):
   - `list`, `get` (throws `fail(404, "products.not_found")`), `create`, `update`, `delete`;
   - every write: change → `audit(ctx.event, { action: "products.<verb>", resource: "products", resourceId })`
     → `announce(...)` publishing `products.created|updated|deleted` with `{ id }` to
     `resourceTopic("products")` and `resourceTopic("products", id)`;
   - business rules and uniqueness checks live here, as `fail(409, "products.<code>")`.
6. **API** `server/api/products/{index.get,index.post,[id].get,[id].patch,[id].delete}.ts`
   (copy `server/api/notes/`). Each handler: `requireUser` → `assertPermission(actor,
   "products", action)` → `readIdParam(event, "products.not_found")` /
   `readBodyWith(event, schema)` → service. `201` on create.
7. **Error texts**: `errors.products.not_found` (and any other code) in BOTH
   `i18n/locales/pt-PT.json` and `en-US.json`.
8. **Page** `app/pages/app/produtos.vue` (copy `app/pages/app/notes.vue`):
   - `definePageMeta({ layout: "app", permission: ["products", "read"], titleKey: "products.title" })`;
   - `useAsyncData` + `useLiveResource("products", refresh)`;
   - `<DataTable>` with columns and `search-keys`, `#row-actions` behind `useCan()`;
   - create/edit in `<ResponsiveDialog>` with `useZodForm(productCreateSchema, ...)`;
   - delete through `useConfirm()({ destructive: true, action })`;
   - toasts with `useNotify().success("products.created")`;
   - `<EmptyState>` when the list is empty.
9. **Navigation** `app/utils/navigation.ts`: an entry with an icon from `@lucide/vue` and
   `permission: ["products", "read"]`; `nav.products` in both locales.
10. **Texts**: a `products.*` block in both locales mirroring `notes.*` (title, description,
    new, edit, created, updated, deleted, fields, delete confirmation, empty state).
11. **API test** `test/api/products.test.ts` (copy `notes.test.ts`, change the DB name in
    `startApp("products")`): permitted role CRUD, forbidden role gets `auth.forbidden`,
    validation error, 404, and the socket receiving `products.*` events.
12. If the dashboard should show it, add a `<StatCard>` in `app/pages/app/index.vue`.

## Verify

```bash
npm run lint:fix
npm run check
npm run test:api
```

Then in the browser: open the page in two tabs, create/edit/delete in one and watch the
other update; sign in as a role without write access and check the buttons are gone and
the API refuses.

## Common mistakes

- Publishing before the write committed, or sending row data in the event (ids only).
- Checking `user.roles.includes("admin")` instead of `assertPermission` / `useCan`.
- A key added to one locale only (the parity test fails).
- `$fetch("/api/products")` in a page (use `useApi()`).
- Forgetting the audit call on one of the writes.
