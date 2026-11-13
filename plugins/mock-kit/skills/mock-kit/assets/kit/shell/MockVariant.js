// MockVariant: shows its content only while its variant is the active one.
import { defineComponent } from "vue"
import { useMock } from "../kit.js"

export default defineComponent({
    name: "MockVariant",
    props: {
        name: { type: String, required: true },
    },
    setup() {
        return { mock: useMock() }
    },
    template: `<div v-if="mock.variant === name" class="contents" :data-variant="name"><slot></slot></div>`,
})
