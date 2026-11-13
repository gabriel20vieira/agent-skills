// MockFrame: the white frame the mock lives in. Desktop (up to 1280px), tablet (768px), mobile (390px), or a
// fixed ratio such as "3:2" for a POS or kiosk screen.
import { computed, defineComponent } from "vue"
import { useMock } from "../kit.js"

export default defineComponent({
    name: "MockFrame",
    props: {
        ratio: { type: String, default: "" },
        width: { type: Number, default: 960 },
    },
    setup(props) {
        const mock = useMock()
        const style = computed(() => {
            if (mock.device === "mobile") return { width: "390px", minHeight: "780px" }
            if (mock.device === "tablet") return { width: "768px", minHeight: "960px" }
            if (props.ratio) {
                const [w, h] = props.ratio.split(":").map(Number)
                return { width: `${props.width}px`, aspectRatio: `${w} / ${h}` }
            }
            return { width: "100%", maxWidth: "1280px", minHeight: "640px" }
        })
        return { mock, style }
    },
    template: `
        <div class="flex justify-center">
            <div class="relative max-w-full overflow-hidden bg-white text-foreground shadow-sm ring-1 ring-slate-200 font-sans"
                :class="mock.device === 'mobile' ? 'rounded-[2rem]' : mock.device === 'tablet' ? 'rounded-[1.5rem]' : 'rounded-xl'"
                :style="style" :data-device="mock.device">
                <slot></slot>
            </div>
        </div>
    `,
})
