# mock-kit

Before a big feature, Claude shows a summary with numbered decisions and an interactive mock,
checks it in the browser, sends you screenshots, and waits for your yes. This plugin makes
those mocks fast and consistent:

- **One HTML file per mock, no build.** Vue 3, Tailwind v4 and Lucide icons by CDN, with
  versions pinned in one place (`_kit/versions.json`).
- **Always white, in your project's style.** Colours, fonts and radii come from your web theme
  (`--from-css`) or your app's tokens (`--from-tokens`).
- **Always interactive.** Simulated state with "Reset", variants A/B/C, desktop and mobile,
  modals and toasts. `check` fails on a mock with nothing to click.
- **A component library that grows.** Reusable pieces become components in
  `_kit/components/`, registered in `components.json` with where they are used.
- **Screenshots.** `shots` captures every variant on desktop and mobile with your Chrome or
  Edge, headless.

```bash
claude plugin install mock-kit@gv-agent-skills
```

The skill loads by itself before large features. In a project it creates:

```
docs/mocks/
  index.html          list of mocks with thumbnails
  mocks.json          lang, and each mock: file, title, date, status, decisions, variants
  _kit/               kit.js, versions.json, theme.css, components.json, components/, shell/
  _shots/             screenshots
  <slug>.html         one mock
```

Script, from the project root:

```bash
node <plugin>/skills/mock-kit/scripts/mock-kit.mjs init --from-css app/assets/css/main.css
node <plugin>/skills/mock-kit/scripts/mock-kit.mjs component OrderList --desc "Orders with actions"
node <plugin>/skills/mock-kit/scripts/mock-kit.mjs new checkout --title "Checkout" --variants A,B --decisions "Pay at the end|Guest checkout"
node <plugin>/skills/mock-kit/scripts/mock-kit.mjs index      # head blocks, index.html, component use
node <plugin>/skills/mock-kit/scripts/mock-kit.mjs check      # exit 1 on problems
node <plugin>/skills/mock-kit/scripts/mock-kit.mjs serve      # http://127.0.0.1:8765/
node <plugin>/skills/mock-kit/scripts/mock-kit.mjs shots checkout
node <plugin>/skills/mock-kit/scripts/mock-kit.mjs status checkout aprovada
```

Shell components: `MockBar`, `MockFrame`, `MockVariant`, `MockRules`, `MockToast`, `MockModal`,
`MockState`, `MockStepper`, `MockIcon`. Mock texts are pt-PT by default (`init --lang en-US`
for English). Set `MOCK_KIT_BROWSER` if your Chrome, Edge or Chromium is not in the usual place.

Design: `docs/superpowers/specs/2026-11-13-mock-kit-design.md`.
