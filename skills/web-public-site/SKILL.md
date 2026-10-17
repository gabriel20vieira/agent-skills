---
name: web-public-site
description: Use when a project built from the web-foundation Nuxt template needs public marketing/content pages with SEO - per-page meta and canonical URLs, sitemap.xml, robots.txt, llms.txt and a cookie notice - or when adding another public page after the module is installed.
---

# Public site module

Installs `modules/public-site` (see its README for the file list).

## Install

1. Copy the files and merge the texts:

   ```bash
   node "${CLAUDE_PLUGIN_ROOT}/skills/web-foundation/scripts/apply-module.mjs" public-site .
   ```

2. `app/layouts/public.vue`: add the notice before the closing root `</div>` and a footer
   link to the example page:

   ```vue
   <CookieNotice />
   ```

   ```vue
   <NuxtLink
       to="/sobre"
       class="hover:text-foreground"
   >
       {{ t("about.title") }}
   </NuxtLink>
   ```

3. Replace `useHead({ title: ... })` with `usePageSeo` in the existing public pages:
   - `app/pages/index.vue`: `usePageSeo({ titleKey: "home.title", descriptionKey: "home.subtitle" })`
   - `app/pages/privacidade.vue`: `usePageSeo({ titleKey: "privacy.title", descriptionKey: "privacy.intro" })`
4. Production: set `NUXT_PUBLIC_I18N_BASE_URL=https://<domain>`. Canonical URLs, the sitemap
   and robots.txt use it (they fall back to the request origin when it is empty).

## Add a public page

1. `app/pages/<slug>.vue` from `sobre.vue` (`layout: "public"`, `auth: false`, `usePageSeo`).
2. Its `titleKey`/`descriptionKey` texts in both locales.
3. An entry in `PUBLIC_PAGES` (`summary` in English if it should appear in `/llms.txt`).
4. If it lives under a new private area instead, add the prefix to `PRIVATE_PREFIXES`.

Pages that list database content (a blog, events) render with `useAsyncData` from a
public API route (no `requireUser`, explicit columns, `Cache-Control` if safe) and add
their items to the sitemap by extending `server/routes/sitemap.xml.ts` with a query.

## Rules

- Meta descriptions come from i18n, never hard-coded.
- The notice stays a notice only while the site sets essential cookies only. Analytics,
  embeds or ads require an opt-in consent that blocks those scripts until accepted.
- Never list `/app`, `/admin`, `/conta` or API routes in the sitemap (the unit test checks).

## Verify

```bash
npm run check
curl -s http://localhost:3000/sitemap.xml
curl -s http://localhost:3000/robots.txt
curl -s http://localhost:3000/llms.txt
curl -s http://localhost:3000/sobre | grep -E 'canonical|og:title|<title>'
```

In the browser: the cookie notice shows once and stays hidden after "OK".
