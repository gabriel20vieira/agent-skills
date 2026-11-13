// __NAME__: __DESC__
// Keep props, emits and slots in sync with this component's entry in components.json.
// No global state and no network: data comes in through props, actions go out through emits.
import { defineComponent } from "vue"

export default defineComponent({
    name: "__NAME__",
    props: {
        title: { type: String, default: "" },
    },
    emits: ["select"],
    template: `
        <div class="rounded-lg border border-border bg-card p-4 text-card-foreground">
            <p v-if="title" class="font-medium">{{ title }}</p>
            <slot></slot>
        </div>
    `,
})
