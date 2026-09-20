---
name: web-theme
description: Use when adding or changing a colour theme in a project built from the web-foundation Nuxt template - imports a tweakcn (or any shadcn CSS-variable) theme as a :root[data-theme] file, registers it for the picker and favicon, and checks light and dark modes.
---

# Add a colour theme

Themes are CSS files that override shadcn tokens under `:root[data-theme="<name>"]` (light)
and `:root[data-theme="<name>"].dark` (dark). The `:root` prefix matters: a bare
`[data-theme]` has the same specificity as `main.css`'s `:root` and loses to it. The chosen
theme is a cookie applied during SSR (`app/plugins/theme.ts`), so pages never flash.
`default` is `app/assets/css/main.css`.

The admin picks the default theme and whether each user may choose
(`/admin/definicoes` → Aparência). Users choose in `/conta`.

## What a theme can change

`main.css` maps all of these through `@theme inline`, so a theme file may set any of them
and the utilities follow at runtime:

- every shadcn colour (`--background`, `--primary`, `--sidebar-*`, `--chart-*`,
  `--destructive-foreground`, ...) plus the template's `--success`, `--warning`, `--danger`;
- `--radius` (the `rounded-*` scale is derived from it);
- `--font-sans`, `--font-serif`, `--font-mono`;
- `--tracking-normal` (drives `tracking-*` and the body letter-spacing);
- `--spacing` (the whole spacing scale);
- `--shadow-2xs` … `--shadow-2xl`.

That is exactly the set a [tweakcn](https://tweakcn.com) theme ships, so a tweakcn export
applies as-is.

## Import a tweakcn theme (fastest)

On tweakcn, open the theme → "Code" → copy the registry URL (or save the CSS), then:

```bash
node "${CLAUDE_PLUGIN_ROOT}/skills/web-theme/scripts/import-theme.mjs" \
    --name claude --from https://tweakcn.com/r/themes/claude.json [--project .]
```

It writes `app/assets/css/themes/<name>.css` scoped to the theme, adds the `@import` to
`main.css`, adds the entry to `THEMES` with the right swatch, and prints what is left:

1. `theme.names.<name>` in BOTH `i18n/locales/*.json`;
2. any web font the theme asks for (it names them) — install it, e.g.
   `npm i @fontsource-variable/inter` plus `@import "@fontsource-variable/inter";` in
   `main.css`, or drop the `--font-*` lines from the theme file to keep the project's fonts;
3. `npm run check` and a look at both modes.

`--from` also takes a local `.css` file with `:root { ... }` and `.dark { ... }` blocks
(any shadcn theme), so the same command works for a hand-written or vendor theme.

## By hand

1. Create `app/assets/css/themes/<name>.css` (`<name>`: lower case, a-z, 0-9, `-`):

   ```css
   /* <Name>: one line on what it looks like. */
   :root[data-theme="<name>"] {
       /* the theme's :root block */
   }

   :root[data-theme="<name>"].dark {
       /* the theme's .dark block */
   }
   ```

   - Override the same tokens in both blocks: a token set only in the light block also
     applies in dark mode (the light block outranks `main.css`'s `.dark`).
   - Never paste an `@theme inline` or `@layer` block here: `main.css` owns those, and a
     second mapping would fight it.
   - Leave out `--tracking-tight`/`--tracking-wide`/... and the `--shadow-color`,
     `--shadow-opacity`, `--shadow-blur`, `--shadow-spread`, `--shadow-offset-*` helpers:
     `main.css` derives the first from `--tracking-normal`, and only the composed
     `--shadow-*` values are used.
2. `@import "./themes/<name>.css";` in `app/assets/css/main.css`, next to the others.
3. `{ name: "<name>", swatch: "<its light --primary>" }` in `shared/utils/themes.ts`
   (the swatch colours the picker dot and the SVG favicon; the settings select reads
   `THEMES`).
4. `theme.names.<name>` in both locales.
5. To make it the default for new visitors, set it in `/admin/definicoes`, or change the
   default of `appearance.defaultTheme` in `shared/utils/settings.ts`.

## Verify

- `npm run check`.
- In the browser, in light and dark: pick the theme in `/conta`, reload (no flash of
  another colour), and check buttons, focus rings, the sidebar, a destructive dialog, a
  toast, a card's shadow and the favicon.
- Contrast: `--primary` vs `--primary-foreground` and `--muted-foreground` vs
  `--background` should reach 4.5:1 (browser devtools colour picker).

## Removing a theme

Delete the file, its import, its `THEMES` entry and its i18n names. Users whose cookie
names it fall back to the admin default automatically (`isThemeName` check).
