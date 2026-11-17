// MockOption: shows its content only while its option is on for the active variant.
//   <mock-option name="Gift wrap">...</mock-option>
// Options are independent on/off choices, declared per variant in createMock({ options }).
// While it is on screen it tells the bar ("on this screen" in the Where panel).
import { defineComponent, onMounted, onUnmounted } from "vue"
import { useMock } from "../kit.js"

export default defineComponent({
    name: "MockOption",
    props: {
        name: { type: String, required: true },
    },
    setup(props) {
        const mock = useMock()
        onMounted(() => { mock.here[props.name] = (mock.here[props.name] ?? 0) + 1 })
        onUnmounted(() => { mock.here[props.name] = Math.max(0, (mock.here[props.name] ?? 1) - 1) })
        return { mock }
    },
    template: `<div v-if="mock.option(name)" class="contents" :data-option="name"><slot></slot></div>`,
})
