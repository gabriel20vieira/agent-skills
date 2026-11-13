# Layout and responsive

Every mock is shown on desktop, tablet and mobile from the bar, so plan the layout for each
before writing it: what is visible on each screen, what stacks, what collapses, what moves.

## Container variants, not viewport ones

The mock lives inside `<mock-frame>`, which is a container (`@container`). Its width is the
chosen device: mobile 390px, tablet 768px, desktop up to 1280px. The browser window stays the
same, so viewport variants (`sm:`, `md:`, `lg:`) never change when the user switches device.
Use Tailwind's container variants, which follow the frame:

| Device  | Frame       | Variant that starts there |
|---------|-------------|---------------------------|
| mobile  | 390px       | (none: write mobile first) |
| tablet  | 768px       | `@3xl:` (48rem)           |
| desktop | 1024px and up | `@5xl:` (64rem)         |

Smaller steps exist too (`@md:` 28rem, `@xl:` 36rem) for parts that change earlier.

```html
<div class="grid gap-4 @3xl:grid-cols-2 @5xl:grid-cols-3">...</div>
<nav class="hidden @3xl:flex">...</nav>
<button class="@3xl:hidden">...</button>
```

`check` warns about viewport variants in a mock. A component used by mocks follows the same
rule.

## What to decide per screen

- **Navigation:** sidebar on desktop, top bar or tabs on tablet, bottom bar or menu on mobile.
- **Lists and tables:** a table on desktop, cards or a list with the key fields on mobile.
- **Forms:** two columns on desktop, one on mobile; primary action reachable without scrolling
  far.
- **Dialogs:** centred on desktop, full-width sheet on mobile.
- **Touch:** targets of at least 40px on tablet and mobile; nothing that needs hover.
- **Density:** fewer columns and less secondary text on mobile; nothing important hidden
  without a way to reach it.

When the project has its own breakpoints or a mobile layout (`docs/ui/`, the app's CSS),
follow them and say so in your message.
