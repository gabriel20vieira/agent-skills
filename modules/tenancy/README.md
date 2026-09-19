# Module: tenancy

Organisations (multi-tenant) for a project built from `templates/nuxt-base`: users belong
to organisations with an organisation role (`owner`, `admin`, `member`), pick an active
one in the sidebar, and org-scoped data is filtered by it.

Adds:
- `server/db/schema/organizations.ts` — `organizations`, `memberships` (PK org+user).
- `shared/utils/tenancy.ts` — `ORG_ROLES`, `orgCan`, `canAssignOrgRole`, `ORG_COOKIE`.
- `shared/schemas/organizations.ts`.
- `server/utils/tenancy.ts` — `requireMembership`, `assertOrgPermission`, `activeOrgId`,
  `setActiveOrgCookie`, `publishToOrg`.
- `server/services/organizations.ts` and `server/api/orgs/**` (list, create, switch, rename,
  delete, members add/role/remove/leave).
- `app/composables/useOrganizations.ts` (+ `useLiveOrgResource`), `app/components/OrgSwitcher.vue`,
  `app/pages/app/organizacoes.vue`.
- `test/unit/tenancy.test.ts`, `test/api/tenancy.test.ts`.
- i18n: `nav.organizations`, `orgs.*`, `errors.orgs.*`.

Core edits (see `skills/web-tenancy/SKILL.md`): schema index, permission matrix, navigation,
sidebar, migration.

Realtime: organisation events fan out to each member's `user:<id>` topic
(`publishToOrg`), so the core topic authorisation is untouched and a removed member stops
receiving immediately.
