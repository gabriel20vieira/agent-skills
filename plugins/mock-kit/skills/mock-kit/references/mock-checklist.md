# Before showing a mock

Go through this in the browser, on the served page, before the user sees anything.

- [ ] `node mock-kit.mjs check` passes.
- [ ] The page loads with no errors or warnings in the console (Vue, Tailwind, unknown icons).
- [ ] Every decision of the summary can be seen and clicked in the mock (the list itself is in
      your message, not in the mock).
- [ ] The main paths work by clicking: open, create, edit, confirm, cancel, go back.
- [ ] Each action gives feedback: a state change, a toast, a modal. Nothing does nothing.
- [ ] Empty, loading and error states exist where the real feature has them (a filter with no
      results, a failed payment).
- [ ] Destructive actions ask with `<mock-modal>`, never `confirm()`.
- [ ] "Reset" (in the bar) restores the initial state.
- [ ] Every variant works on its own (switch with the bar tabs).
- [ ] Every option works on and off, alone and together, in each variant that has it.
- [ ] Desktop, tablet and mobile all work: nothing overflows the frame, nothing important is
      cut, touch targets are large enough on tablet and mobile.
- [ ] The layout changes where it should between the three (columns stack, navigation
      collapses, tables become lists), with container variants (`@md:`), not `md:`
      (`references/layout.md`). `check` warns about viewport breakpoints.
- [ ] "Estado" in the bar shows the simulated state; the page has no state panel.
- [ ] Texts are realistic and in the project's language; no "lorem ipsum", no "Item 1".
- [ ] The look follows the project: theme colours, font and radius, and its UI guide if any.
- [ ] Page and frame are white.
- [ ] `node mock-kit.mjs shots <slug>` ran and the screenshots look right: open them before
      sending.

Then present in your message: the summary, the numbered decisions, the variants and their
options, the screenshots and the local link.
