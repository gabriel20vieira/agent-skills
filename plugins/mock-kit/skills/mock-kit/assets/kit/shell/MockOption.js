// MockOption: shows its content only while its option is on for the active variant.
//   <mock-option name="Gift wrap">...</mock-option>
// Options are independent on/off choices, declared per variant in createMock({ options }).
import { defineComponent } from "vue"
import { useMock } from "../kit.js"

export default defineComponent({
    name: "MockOption",
    props: {
        name: { type: String, required: true },
    },
    setup() {
        return { mock: useMock() }
    },
    template: `<div v-if="mock.option(name)" class="contents" :data-option="name"><slot></slot></div>`,
})
