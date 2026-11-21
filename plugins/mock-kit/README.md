# mock-kit

Before a big feature, Claude shows a summary with numbered decisions and an interactive mock,
checks it in the browser, sends you screenshots, and waits for your yes. This plugin makes
those mocks fast and consistent:

- **One HTML file per mock, no build.** Vue 3, Tailwind v4 and Lucide icons by CDN, with
  versions pinned in one place (`_kit/versions.json`).
- **Always white, in your project's style.** Colours, fonts and radii come from your web theme
  (`--from-css`) or your app's tokens (`--from-tokens`).
- **Always interactive.** The bar's first row shows desktop, tablet and mobile with "State" (the
  simulated state as a searchable, collapsible JSON tree) and "Reset"; the second row shows
  variants A/B/C with the selected variant's options next to it (A with X and Y, B with Y and Z,
  each with its own on/off state), and "Where": where each option acts, with "Go" to get there. Modals and toasts. `check` fails on a mock with nothing to click.
- **Responsive.** The frame is a container: mocks use container variants (`@3xl:`), so the
  layout follows the chosen device. `check` warns about viewport breakpoints.
- **The choice is recorded.** What is selected in the bar is saved in `mocks.json`; the user
  can also say it in the chat. `choice <slug>` reads or sets it.
- **A component library that grows.** Reusable pieces become components in
  `_kit/components/`, registered in `components.json` with where they are used.
- **Screenshots.** `shots` captures every variant on desktop, tablet and mobile with your
  Chrome or Edge, headless.

```bash
claude plugin install mock-kit@gv-agent-skills
```

The skill loads by itself before large features. In a project it creates:

```
docs/mocks/
  index.html          mocks with thumbnails in tabs: Ativas, Implementadas, Arquivadas
  mocks.json          lang, and each mock: file, title, date, status, decisions, variants, options, choice
  _kit/               kit.js, versions.json, theme.css, components.json, components/, shell/
  _shots/             screenshots
  <slug>.html         one mock
```

Script, from the project root:

```bash
node <plugin>/skills/mock-kit/scripts/mock-kit.mjs init --from-css app/assets/css/main.css
node <plugin>/skills/mock-kit/scripts/mock-kit.mjs component OrderList --desc "Orders with actions"
node <plugin>/skills/mock-kit/scripts/mock-kit.mjs new checkout --title "Checkout" --variants A,B --options "A:Coupons,Gift wrap;B:Gift wrap,Express"
node <plugin>/skills/mock-kit/scripts/mock-kit.mjs index      # head blocks, index.html, component use
node <plugin>/skills/mock-kit/scripts/mock-kit.mjs check      # exit 1 on problems
node <plugin>/skills/mock-kit/scripts/mock-kit.mjs serve      # http://127.0.0.1:8765/ lists every mock
node <plugin>/skills/mock-kit/scripts/mock-kit.mjs choice checkout                         # what to implement
node <plugin>/skills/mock-kit/scripts/mock-kit.mjs choice checkout --variant B --options "Express"
node <plugin>/skills/mock-kit/scripts/mock-kit.mjs shots checkout
node <plugin>/skills/mock-kit/scripts/mock-kit.mjs shots checkout --variants B --options "Express"
node <plugin>/skills/mock-kit/scripts/mock-kit.mjs status checkout aprovada    # proposta > aprovada > implementada | arquivada
```

Shell components: `MockBar`, `MockFrame`, `MockVariant`, `MockOption`, `MockToast`, `MockModal`, `MockJson`,
`MockStepper`, `MockIcon`. Mock texts are pt-PT by default (`init --lang en-US`
for English). The decisions are written in Claude's message, not in the mock. Set `MOCK_KIT_BROWSER` if your Chrome, Edge or Chromium is not in the usual place.

Design: `docs/superpowers/specs/2026-11-13-mock-kit-design.md`.

## License

MIT. See [LICENSE](LICENSE).
