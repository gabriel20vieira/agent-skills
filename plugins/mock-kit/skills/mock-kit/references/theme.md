# Theme

Mocks are always white and light, and look like the project: its colours, font and radii, or
the closest match.

## Web projects

Find the CSS that defines the design tokens (custom properties on `:root`, or a Tailwind v4
`@theme` block). Common places: `app/assets/css/main.css` (Nuxt), `src/index.css` or
`src/app/globals.css` (Vite, Next.js), `styles/tokens.css`.

```
node mock-kit.mjs init --from-css app/assets/css/main.css
node mock-kit.mjs theme --from-css app/assets/css/main.css    # later, after the theme changes
```

Only light tokens are read: `.dark` blocks and media queries are skipped. shadcn-style names
(`--primary`, `--muted-foreground`, `--radius`) become Tailwind classes (`bg-primary`,
`text-muted-foreground`, `rounded-lg`). Tokens missing from the project are filled with
neutral defaults, so the shell and the templates always have what they use.

## Apps (mobile, desktop)

When the theme lives in code (Flutter `ThemeData`, Android `colors.xml` or Compose
`ColorScheme`, SwiftUI asset colours, React Native styles), read it and write a tokens JSON,
then:

```
node mock-kit.mjs init --from-tokens docs/mocks/_kit/tokens.json
```

```json
{
    "primary": "#1E6BFF",
    "primary-foreground": "#FFFFFF",
    "background": "#FFFFFF",
    "foreground": "#14161A",
    "muted": "#F2F4F7",
    "muted-foreground": "#667085",
    "border": "#E4E7EC",
    "radius": "12px",
    "font-sans": "\"Roboto\", system-ui, sans-serif"
}
```

Nested W3C or Style Dictionary tokens work too (`{ "color": { "primary": { "$value": "#1E6BFF" } } }`
becomes `--color-primary`). Use the shadcn names above when you can: the shell and the
component template use them.

## Fonts

If the project uses a web font, add its `<link>` or `@import` at the top of
`_kit/theme.css` after `theme` writes it, and set `font-sans`. Otherwise system fonts are used.

## No theme

`init` without `--from-*` writes neutral tokens. Mention it to the user: the mock shows
layout and flow, not the final look.
