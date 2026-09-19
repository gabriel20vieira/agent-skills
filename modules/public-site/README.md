# Module: public-site

Public pages with SEO for a project built from `templates/nuxt-base`.

Adds:
- `shared/utils/publicPages.ts` — the list of public pages (sitemap, llms.txt) and the
  private prefixes robots.txt disallows.
- `app/composables/usePageSeo.ts` — title, description, Open Graph, canonical URL.
- `server/routes/sitemap.xml.ts`, `robots.txt.ts`, `llms.txt.ts`.
- `app/components/CookieNotice.vue` — notice for essential cookies (not a consent banner).
- `app/pages/sobre.vue` — example public page.
- `test/unit/publicPages.test.ts`.
- i18n: `about.*`, `cookies.*`.

Core edits (see `skills/web-public-site/SKILL.md`): `layouts/public.vue`, `pages/index.vue`,
`pages/privacidade.vue`.

Remove: delete the files above, the i18n blocks and the core edits.
