# Variants and options

Two independent axes, both shown in the mock bar:

- **Variants (A, B, C...)**: alternative approaches; one is active at a time.
- **Options (X, Y, Z...)**: independent pieces each variant may or may not include, switched on
  and off. Each variant has its own list: A with X and Y, B with Y and Z.

Add them depending on what the user asked, case by case: a mock may have one variant and no
options, variants only, or variants with options.

## Variants

Use variants when there is a real choice for the user to make: two layouts, two flows, two
ways to group data. Not for small details: those are decisions in the summary.

- **At most three** (A, B, C). More than that means the question is not clear yet.
- **One difference per variant set.** A and B differ in the thing being decided; everything
  else is the same, so the user compares one thing.
- **Same data and state** across variants, so switching shows the difference, not new data.
- **Name what each one is** in the summary:

```
Variante A: lista simples com filtro por estado.
  + mais rápida de ler; - perde a noção de dia.
Variante B: agrupada por dia (Hoje, Ontem).
  + mostra o volume diário; - mais scroll no telemóvel.
Recomendo A, porque ...
```

- **Recommend one**, and say why in one line.

## Options

Use options for pieces that can be built or left out without changing the approach: a
coupon field, a "save for later" button, a summary sidebar, an extra filter.

```
node mock-kit.mjs new checkout --title "Checkout" --variants A,B --options "A:Cupões,Embrulho;B:Embrulho,Entrega expresso"
```

```html
<mock-option name="Cupões">
    <coupon-field @apply="applyCoupon"></coupon-field>
</mock-option>
```

or `v-if="option('Cupões')"` in any template.

### Where each option acts

An option often acts on a screen the user is not looking at. Every option says where it acts,
and how to get there when that is not the first screen. `new` writes `where` with the mock's
title; replace it with the real path:

```js
options: {
    A: [
        { id: "Cupões", where: "Checkout > Pagamento > Resumo", go: (state) => { state.step = "payment" } },
        { id: "Embrulho", default: false, where: "Checkout > Carrinho > Linha do produto" },
    ],
    B: [{ id: "Embrulho", where: "Checkout > Entrega > Opções" }],
}
```

- `where`: `"Page > Section > Element"`, as the user would find it. The bar's "Onde" panel
  shows it for each option of the selected variant, marks "neste ecrã" when its
  `<mock-option>` is on screen, and offers "Ir" when there is a `go`.
- `go(state, mock)`: changes the simulated state to that screen (page, tab, step, open
  dialog). Give one whenever the option is not on the first screen.
- `default: false` starts the option off.
- Each variant keeps its own on/off state, even for an option with the same name, and the bar
  shows only the selected variant's options, next to it.
- `check` warns about an option without `where`.

- The mock must work with every option on and off: no gaps, no broken layout.
- In your message, list each variant's options with what each adds and costs, and which you
  would include.
- Screenshots use the defaults; take a specific combination with
  `shots <slug> --variants A --options "Cupões"`.
- Create them with `--variants A,B` and put each in its `<mock-variant name="...">`. The bar
  switches between them; `?variant=B` opens one directly, and `shots` captures each.
- After the choice, keep only the chosen variant and options in the mock (or note the choice
  in `mocks.json` decisions) before marking it `aprovada`.
