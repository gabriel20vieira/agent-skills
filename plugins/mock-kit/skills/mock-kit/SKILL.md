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
   (Decision 1, 2, 3...). No app code yet. The decisions, variants and options are written in
   your message, never inside the mock.
2. **Kit.** If the mocks folder has no `_kit/`, run `node "$MOCK" init`. When the project has a
   theme, use it (`references/theme.md`): web CSS with `--from-css <file>`, an app's theme as a
   tokens JSON with `--from-tokens <file>`. Mocks are always white and light; colours, fonts and
   radii come from the theme. After a plugin update, `init --update-shell` refreshes `kit.js` and
   the shell (and removes shell files no longer shipped); components and versions stay.
3. **Reuse before writing.** Read `_kit/components.json`. Use what exists. Anything new that
   another mock could use (a list with actions, a stepped form, a status card, the project's
   navigation bar) becomes a component: `node "$MOCK" component <Name> --desc "..."`, then
   write it (`references/components.md`). Never paste a reusable block straight into a mock.
4. **Write the mock.** `node "$MOCK" new <slug> --title "..." --variants A,B --options "A:X,Y;B:Y,Z"`
   (`--decisions "a|b|c"` keeps them in `mocks.json` for the record), then replace the
   placeholder content:
   - realistic data in the project's language (names, amounts, dates, states);
   - simulated state in `state: () => ({ ... })`, so "Reset" restores it;
   - every interaction clickable: buttons, filters, forms, tabs, confirmations, empty and error
     states. A mock that cannot be clicked is not a mock (`check` fails without interactions);
   - variants (A, B, C...) when there is a choice of approach, and per-variant options (X, Y,
     Z...) for independent pieces that can be built or left out (`references/variants.md`):
     whether to add them depends on what the user asked, case by case. Every option says
     where it acts (`where: "Page > Section > Element"`) and, when that is not the first
     screen, how to get there (`go`), so the bar's "Onde" panel can take the user to it;
   - layout and responsive behaviour planned for each screen: the bar always offers desktop,
     tablet and mobile and the mock must be right on all three. The frame is a container, so
     use container variants (`@md:`, `@3xl:`, `@5xl:`), never viewport ones (`md:`), which
     follow the browser window instead of the chosen device (`references/layout.md`).
5. **Index.** `node "$MOCK" index` (head blocks, `index.html`, which mock uses which component),
   then `node "$MOCK" check`.
6. **Verify in the browser.** Serve the folder: add the entry `serve` prints to
   `.claude/launch.json` and open it in the browser pane (or run `node "$MOCK" serve` in the
   background). The root `http://127.0.0.1:8765/` lists every mock in the folder; a mock is at
   `/<slug>.html`. Go through
   `references/mock-checklist.md`: main paths clicked, console without errors, desktop, tablet
   and mobile, every variant and option. Fix and repeat until it passes.
7. **Screenshots.** `node "$MOCK" shots <slug>` writes desktop, tablet and mobile shots of
   every variant to `_shots/`, with each variant's default options. For a specific
   combination: `shots <slug> --variants B --options "Y,Z"` (`--options ""` for none). Look at
   them, then show them to the user with the summary and the link: send the PNG files
   (SendUserFile when available) or show them inline. Always include screenshots when
   presenting a mock.
8. **Present** in your message: the summary, the numbered decisions, each variant and its
   options with pros and cons and your recommendation, the screenshots and the local link.
9. **Iterate** with the user until they say yes. Then `node "$MOCK" status <slug> aprovada`.
   After the feature is built, `node "$MOCK" status <slug> implementada`. A mock that is
   dropped or replaced: `status <slug> arquivada`.

Statuses: `proposta` > `aprovada` > `implementada` or `arquivada`. The index (`/`) has three
tabs: **Ativas** (proposta and aprovada), **Implementadas** and **Arquivadas**; archived mocks
show only in Arquivadas (`/#arquivadas` opens it).

## Choice: which variant and options to implement

The user can say in the chat which variant and options to build ("B with Y"). Record it:
`node "$MOCK" choice <slug> --variant B --options "Y"` (`--options ""` for none).

When they do not say it, the choice is what is selected in the mock: the bar records every
change of variant or option in `mocks.json` while the page is served. Read it with
`node "$MOCK" choice <slug>` (`{"variant":"B","options":["Y"],"source":"mock"}`; `"default"`
when nothing was ever selected: the first variant with its options). Before implementing, say
it in the chat, for example: "Vou implementar o que está selecionado na mock: variante B com
Y. Se preferires outra combinação, diz-me." Then build exactly that combination.

## Rules

- Never `alert()`, `confirm()` or `prompt()`: use `<mock-modal>` and `toast()`.
- A mock is for deciding, not production code. When implementing, rewrite in the project's
  conventions; never copy mock code into the app.
- Mock texts in the project's language (`mocks.json` `lang`).
- Components follow the project's theme: use the token classes (`bg-primary`,
  `text-muted-foreground`, `border-border`, `rounded-lg`, `font-sans`), and read the project's
  UI guide (for example `docs/ui/`) when there is one.
- Page and frame are always white. Never add a dark mode to a mock.
- No decision list inside the mock: what the mock decides is written in your message.
- The simulated state is in the bar ("Estado", next to the screens: a JSON tree with search
  and collapsible objects and arrays); never add a state panel
  to the page.
- In HTML files, components are written in kebab-case with a closing tag
  (`<order-list></order-list>`), never self-closing.
- Cleaning up: a mock the user no longer wants in view is archived (`status <slug> arquivada`),
  which keeps the file and moves it to the Arquivadas tab. When the user asks to delete mocks,
  delete the files they named, then
  `node "$MOCK" index` so `mocks.json`, `index.html` and the components' use stay right.
  Components without use are kept and marked `unused`; delete one only when the user asks.
