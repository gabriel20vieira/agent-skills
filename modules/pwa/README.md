# Module: pwa

Makes a project built from `templates/nuxt-base` installable, with an offline page.

Adds:
- `server/routes/manifest.webmanifest.ts` — name from `NUXT_PUBLIC_APP_NAME`, hex colours,
  `start_url` `/app`.
- `server/routes/icon.svg.ts` — generated letter icon (normal and `?maskable=1`).
- `server/routes/sw.js.ts` — service worker versioned by the app version: cache-first for
  `/_nuxt/` assets, network-first navigations with `/offline` as fallback, never `/api` or `/_ws`.
- `app/plugins/pwa.client.ts` — registers the worker outside dev; keeps the install prompt.
- `app/composables/usePwaInstall.ts`, `app/components/InstallAppButton.vue`.
- `app/pages/offline.vue`.
- i18n: `pwa.*`.

Core edits (see `skills/web-pwa/SKILL.md`): `app/app.vue` (manifest link, theme colour),
`app/layouts/app.vue` (install button).

Remove: delete the files and edits, and ship one release whose `sw.js` unregisters itself
(`self.registration.unregister()` in `activate`) so installed clients drop the old worker.
