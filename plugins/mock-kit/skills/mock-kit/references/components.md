# Writing a component

A component is one ES module in `_kit/components/<Name>.js`, created with
`mock-kit.mjs component <Name> --desc "..."`, registered in `_kit/components.json`.

```js
// OrderList: list of orders with actions
import { defineComponent } from "vue"
import StatusBadge from "./StatusBadge.js"

export default defineComponent({
    name: "OrderList",
    components: { StatusBadge },
    props: {
        orders: { type: Array, required: true },
    },
    emits: ["select", "cancel"],
    template: `
        <ul class="divide-y divide-border rounded-lg border border-border bg-card">
            <li v-for="order in orders" :key="order.id" class="flex items-center gap-3 px-4 py-3">
                <button type="button" class="flex-1 text-left" @click="$emit('select', order)">#{{ order.id }}</button>
                <status-badge :status="order.status"></status-badge>
            </li>
        </ul>
    `,
})
```

Rules:

- **Template as a string.** No `.vue` files, no build. The template is compiled in the browser.
- **Props in, emits out.** Data comes through props; actions leave through emits. The mock
  decides what an action does.
- **No global state, no network.** No `fetch`, no `localStorage`, no imports from outside
  `_kit/`. A component may use `useMock()` from `../kit.js` only to read texts or the device.
- **Theme classes.** Use the token classes (`bg-card`, `text-muted-foreground`,
  `border-border`, `bg-primary text-primary-foreground`, `rounded-lg`), so the component
  follows the project's theme. Plain Tailwind colours only for states (amber, emerald, sky).
- **Slots** for content the caller decides (a default slot, or named slots like `actions`).
- **Icons** with `<mock-icon name="shopping-cart" :size="16"></mock-icon>` (Lucide names).
- **Used by other components:** import them and list them in `components`.
- **Keep `components.json` in sync:** `props`, `emits`, `slots` and a one-line `example`. The
  next mock reads this file before writing anything.

Using it in a mock:

```html
<order-list :orders="visible" @select="open" @cancel="askCancel"></order-list>
<script type="module">
import { createMock } from "./_kit/kit.js"
import OrderList from "./_kit/components/OrderList.js"
createMock({ components: { OrderList }, ... })
</script>
```

In the HTML file, write tags in kebab-case with a closing tag: the browser parses that HTML
before Vue does, so `<OrderList />` would not work there. Inside a component's string
template either form works.
