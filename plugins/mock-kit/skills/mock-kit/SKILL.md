---
name: mock-kit
description: Use before implementing a large feature, a new screen or flow, or a UI change with choices to make - present a short summary with numbered decisions and an interactive mock (one HTML file, Vue 3 + Tailwind by CDN, no build), always white and styled like the project's own theme, reusing and growing the project's mock component library, verified in the browser and shown to the user with screenshots before any app code is written. Also use to update, approve or clean up existing mocks.
---

# Mock kit

Before building something large, show it first. The user gets a short summary with numbered
decisions and a mock they can click through, sees screenshots of it, and says yes before any
app code is written. Speak to the user in their language; mock texts follow `mocks.json`
(`lang`, pt-PT by default).

```
MOCK="${CLAUDE_PLUGIN_ROOT}/skills/mock-kit/scripts/mock-kit.mjs"
```

Every mock is one HTML file in the project's mocks folder (`docs/mocks/` unless `--dir` says
otherwise), with Vue 3, Tailwind v4 and Lucide icons by CDN, opened through a local server. It
reuses the project's component library in `_kit/components/` and the shell in `_kit/shell/`.
Versions live in `_kit/versions.json`; the theme in `_kit/theme.css`.

## Flow

1. **Summary first.** A few lines on what will be built, and the decisions as a numbered list
   (Decision 1, 2, 3...). No app code yet.
2. **Kit.** If the mocks folder has no `_kit/`, run `node "$MOCK" init`. When the project has a
   theme, use it (`references/theme.md`): web CSS with `--from-css <file>`, an app's theme as a
   tokens JSON with `--from-tokens <file>`. Mocks are always white and light; colours, fonts and
   radii come from the theme.
3. **Reuse before writing.** Read `_kit/components.json`. Use what exists. Anything new that
   another mock could use (a list with actions, a stepped form, a status card, the project's
   navigation bar) becomes a component: `node "$MOCK" component <Name> --desc "..."`, then
   write it (`references/components.md`). Never paste a reusable block straight into a mock.
4. **Write the mock.** `node "$MOCK" new <slug> --title "..." --variants A,B --decisions "a|b|c"`,
   then replace the placeholder content:
   - realistic data in the project's language (names, amounts, dates, states);
   - simulated state in `state: () => ({ ... })`, so "Reset" restores it;
   - every interaction clickable: buttons, filters, forms, tabs, confirmations, empty and error
     states. A mock that cannot be clicked is not a mock (`check` fails without interactions);
   - variants when there is a choice to make (`references/variants.md`);
   - the decisions in `<mock-rules>`, numbered as in the summary.
5. **Index.** `node "$MOCK" index` (head blocks, `index.html`, which mock uses which component),
   then `node "$MOCK" check`.
6. **Verify in the browser.** Serve the folder: add the entry `serve` prints to
   `.claude/launch.json` and open it in the browser pane (or run `node "$MOCK" serve` in the
   background and open `http://127.0.0.1:8765/<slug>.html`). Go through
   `references/mock-checklist.md`: main paths clicked, console without errors, desktop and
   mobile, every variant. Fix and repeat until it passes.
7. **Screenshots.** `node "$MOCK" shots <slug>` writes desktop and mobile shots of every
   variant to `_shots/`. Look at them, then show them to the user with the summary and the
   link: send the PNG files (SendUserFile when available) or show them inline. Always include
   screenshots when presenting a mock.
8. **Iterate** with the user until they say yes. Then `node "$MOCK" status <slug> aprovada`.
   After the feature is built, `node "$MOCK" status <slug> implementada`.

## Rules

- Never `alert()`, `confirm()` or `prompt()`: use `<mock-modal>` and `toast()`.
- A mock is for deciding, not production code. When implementing, rewrite in the project's
  conventions; never copy mock code into the app.
- Mock texts in the project's language (`mocks.json` `lang`).
- Components follow the project's theme: use the token classes (`bg-primary`,
  `text-muted-foreground`, `border-border`, `rounded-lg`, `font-sans`), and read the project's
  UI guide (for example `docs/ui/`) when there is one.
- Page and frame are always white. Never add a dark mode to a mock.
- In HTML files, components are written in kebab-case with a closing tag
  (`<order-list></order-list>`), never self-closing.
- Cleaning up: when the user asks to delete mocks, delete the files they named, then
  `node "$MOCK" index` so `mocks.json`, `index.html` and the components' use stay right.
  Components without use are kept and marked `unused`; delete one only when the user asks.
