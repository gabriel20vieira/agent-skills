---
name: web-pwa
description: Use when a project built from the web-foundation Nuxt template should be installable on phones/desktops (Add to Home Screen) or show an offline page - installs the PWA module (manifest, icon, service worker, install button, /offline).
---

# PWA module

Installs `modules/pwa` (file list in its README). No build plugin: the manifest, icon and
service worker are Nitro routes, so they follow the app name, default theme and version.

## Install

1. Copy the files and merge the texts:

   ```bash
   node "${CLAUDE_PLUGIN_ROOT}/skills/web-foundation/scripts/apply-module.mjs" pwa .
   ```

2. `app/app.vue`: add the manifest and theme colour to the existing `useHead` call:

   ```ts
   link: [{ rel: "manifest", href: "/manifest.webmanifest" }, { rel: "apple-touch-icon", href: "/icon.svg" }],
   meta: [{ name: "theme-color", content: "#ffffff", media: "(prefers-color-scheme: light)" },
          { name: "theme-color", content: "#0a0a0a", media: "(prefers-color-scheme: dark)" }],
   ```

   (If `useHead` there is a function returning an object, add the keys to that object.)
3. `app/layouts/app.vue`: `<InstallAppButton />` in the header's right-hand group, before
   `<LocaleSwitcher />`. It only renders where the browser offers installation.
4. Replace the generated icon for a real product: put `icon.svg` plus 192/512 PNGs in
   `public/`, delete `server/routes/icon.svg.ts` and point the manifest `icons` at them.

## How it behaves

- The worker is registered only in production builds (`npm run build && npm run start`),
  never in `npm run dev`.
- Each release (package `version`) gets a new cache; old ones are deleted on activate.
  Bump the version on release so clients drop old assets.
- Pages are always fetched from the network (so sessions and permissions stay live);
  offline they fall back to `/offline`. API calls are never cached.
- Needs HTTPS in production (localhost is exempt).

## Rules

- Never cache `/api/*` or HTML that contains a user's data in the worker.
- Do not add push notifications or background sync without a design: they need
  per-user subscriptions stored server-side and their own permission prompt UX.

## Verify

```bash
npm run check
npm run build && npm run start
curl -s http://localhost:3000/manifest.webmanifest
curl -sI http://localhost:3000/sw.js
```

In Chrome DevTools → Application: the manifest has no errors, the service worker is
activated, and with "Offline" ticked a navigation shows `/offline`. Lighthouse
"Installable" passes.
