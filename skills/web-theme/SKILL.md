---
name: web-theme
description: Use when adding or changing a colour theme in a project built from the web-foundation Nuxt template - imports a tweakcn (or any shadcn CSS-variable) theme as a [data-theme] file, registers it for the picker and favicon, and checks light and dark modes.
---

# Add a colour theme

Themes are CSS files that override shadcn tokens under `:root[data-theme="<name>"]` (light)
and `:root[data-theme="<name>"].dark` (dark). The `:root` prefix matters: a bare
`[data-theme]` has the same specificity as `main.css`'s `:root` and loses to it. The chosen theme is a cookie applied during SSR
(`app/plugins/theme.ts`), so pages never flash. `default` is `app/assets/css/main.css`.

The admin picks the default theme and whether each user may choose
(`/admin/definicoes` → Aparência). Users choose in `/conta`.

## Steps

1. **Get the tokens.** From [tweakcn](https://tweakcn.com) use "Code" → Tailwind v4 CSS, or
   take any shadcn theme. You need the `:root { ... }` and `.dark { ... }` blocks.
2. **Create** `app/assets/css/themes/<name>.css` (`<name>` = lower case, a-z and `-`):

   ```css
   /* <Name>: one line on what it looks like. */
   :root[data-theme="<name>"] {
       /* the :root block, only tokens that differ from main.css */
   }

   :root[data-theme="<name>"].dark {
       /* the .dark block */
   }
   ```

   - Override the same tokens in both blocks: a token set only in the light block also
     applies in dark mode (the light block outranks `main.css`'s `.dark`).
   - Keep only colour tokens (`--background`, `--primary`, `--sidebar-*`, `--chart-*`, ...).
     Drop `--radius`, fonts and shadows unless the project wants them in every theme; if
     it does, change them in `main.css` instead.
   - Convert `hsl(...)`/hex values to `oklch(...)` only if mixing formats looks off;
     browsers accept all of them.
   - Never paste an `@theme inline` block here: `main.css` already maps the tokens.
3. **Import** it in `app/assets/css/main.css` next to the others:
   `@import "./themes/<name>.css";`
4. **Register** it in `shared/utils/themes.ts`: `{ name: "<name>", swatch: "<its light --primary>" }`.
   `swatch` colours the picker dot and the SVG favicon. The settings schema reads
   `THEMES`, so the admin select picks it up automatically.
5. **Name it** in both locales: `theme.names.<name>`.
6. To make it the default for new visitors, set it in `/admin/definicoes` (stored in the
   DB), or change the default of `appearance.defaultTheme` in `shared/utils/settings.ts`.

## Verify

- `npm run check`.
- In the browser, for light and dark: pick the theme in `/conta`, reload (no flash of
  another colour), check buttons, focus rings, sidebar, a destructive dialog, a toast and
  the favicon.
- Contrast: `--primary` vs `--primary-foreground` and `--muted-foreground` vs
  `--background` should reach 4.5:1 (check with the browser devtools colour picker).

## Removing a theme

Delete the file, its import, its `THEMES` entry and its i18n names. Users whose cookie
names it fall back to the admin default automatically (`isThemeName` check).
