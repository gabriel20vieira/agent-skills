# Modules

Optional features applied to a project built from `templates/nuxt-base`, each by its skill.

| Module | Skill | Adds |
|---|---|---|
| `public-site` | `web-public-site` | SEO per page, sitemap.xml, robots.txt, llms.txt, cookie notice |
| `pwa` | `web-pwa` | manifest, icon, service worker, install button, /offline |
| `tenancy` | `web-tenancy` | organisations, memberships and roles, switcher, org-scoped data |
| `assistant` | `web-assistant`, `web-assistant-tool` | AI chat with permission-aware tools and proposal cards |

Layout of a module:

```
<name>/
  README.md        what it adds, core files it touches, how to remove it
  files/           new files, at their project paths (app/, server/, shared/, test/)
  i18n/<locale>.json   keys merged into the project's locales
```

`skills/web-foundation/scripts/apply-module.mjs <name> <project>` copies `files/` (never
overwriting) and merges the i18n keys (never overwriting). The edits to existing core files
(permission matrix, settings, navigation, schema index, layouts) are listed in the module's
skill with the exact code; migrations are generated in the project with `npm run db:generate`.

A module's files must pass the project's `npm run check` and `npm run test:api` once
applied. Test all four together by creating a project with `web-new-project`, applying
every module and following each skill's install steps.
