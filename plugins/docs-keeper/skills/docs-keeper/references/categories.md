# Categories

One folder per category under `docs/`, one file per topic inside it. Create a category only
when its signals are there. The topics are suggestions: name files after what the project
actually has (`docs/features/invoices.md`, not `docs/features/feature-1.md`).

| Folder | Covers | Signals | Typical topics |
|---|---|---|---|
| `architecture/` | the big picture: layers, folder layout, data flow, main dependencies | always | `overview.md`, `folder-layout.md`, `data-flow.md` |
| `ui/` | UI and theming: components, layouts, design system, themes, dark mode | a frontend framework (Vue, React, Svelte, ...), a components folder, CSS or Tailwind config, theme files | `components.md`, `layouts.md`, `theming.md` |
| `data/` | database, schema, migrations, models, seeds | an ORM or query builder, migration folders, `.sql` files | `schema.md`, `migrations.md` |
| `api/` | endpoints, request and response shapes, errors, conventions | server route folders, controllers, an OpenAPI file | `conventions.md`, `errors.md`, one file per resource when large |
| `auth/` | authentication, sessions, roles and permissions | an auth library, session handling, a permission matrix | `sessions.md`, `permissions.md` |
| `realtime/` | WebSocket, SSE, pub/sub, events | a WS or SSE server, event topics | `events.md` |
| `i18n/` | languages, keys, formats, time zones | a locales folder, an i18n library | `locales.md` |
| `testing/` | test strategy, commands, fixtures, environments | test folders and test config | `strategy.md`, `api-tests.md` |
| `operations/` | deploy, environments, secrets, backups, CI, monitoring | Dockerfile, compose files, CI config, deploy scripts | `deploy.md`, `backups.md`, `ci.md` |
| `integrations/` | external services and SDKs: what, why, keys, limits | third-party SDKs, API keys in `.env.example` | one file per service |
| `features/` | one file per feature or module of the domain | modules, resources, pages of the domain | one file per feature |
| `decisions/` | one decision per file: context, decision, consequences, alternatives | whenever a real decision is made | `<yyyy-mm-dd>-<slug>.md` |
| `guides/` | setup and frequent tasks, step by step | always | `setup.md`, `add-a-resource.md` |

Split a category when one file grows past what a reader takes in at once (roughly 300
lines): move parts into their own topic files and link them. Merge two thin categories only
if the project is small and the user agrees.

A project may need a category that is not here (for example `ml/` or `payments/`). Create it
with the same rules: a folder, one file per topic, and the same format.
