// MockBar: the "MOCK" strip with the title, variant tabs, desktop/mobile switch, an optional
// simulated clock and "Reset".
import { computed, defineComponent } from "vue"
import { useMock } from "../kit.js"

function shift(time, minutes) {
    const [hours, mins] = time.split(":").map(Number)
    const total = (((hours * 60 + mins + minutes) % 1440) + 1440) % 1440
    return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`
}

export default defineComponent({
    name: "MockBar",
    props: {
        title: { type: String, default: "" },
    },
    setup() {
        const mock = useMock()
        const hasVariants = computed(() => mock.variants.length > 1)
        return { mock, hasVariants, shift }
    },
    template: `
        <header class="sticky top-0 z-40 border-b border-amber-200 bg-amber-50/95 backdrop-blur">
            <div class="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-2 text-sm text-slate-700">
                <span class="rounded bg-amber-400 px-2 py-0.5 text-xs font-bold tracking-widest text-amber-950">{{ mock.t.mock }}</span>
                <span class="font-medium text-slate-900">{{ title }}</span>
                <nav v-if="hasVariants" class="flex items-center gap-1" :aria-label="mock.t.variant">
                    <button v-for="name in mock.variants" :key="name" type="button"
                        class="rounded-md px-2.5 py-1 text-xs font-semibold transition"
                        :class="mock.variant === name ? 'bg-slate-900 text-white' : 'bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100'"
                        @click="mock.variant = name">{{ mock.t.variant }} {{ name }}</button>
                </nav>
                <div class="ml-auto flex items-center gap-2">
                    <div v-if="mock.clock" class="flex items-center gap-1 rounded-md bg-white px-2 py-1 ring-1 ring-slate-200" :title="mock.t.clock">
                        <mock-icon name="clock" :size="14"></mock-icon>
                        <button type="button" class="px-1 text-slate-500 hover:text-slate-900" @click="mock.clock = shift(mock.clock, -15)">-15</button>
                        <span class="font-mono text-xs tabular-nums text-slate-900">{{ mock.clock }}</span>
                        <button type="button" class="px-1 text-slate-500 hover:text-slate-900" @click="mock.clock = shift(mock.clock, 15)">+15</button>
                    </div>
                    <div class="flex rounded-md bg-white p-0.5 ring-1 ring-slate-200">
                        <button type="button" class="flex items-center gap-1 rounded px-2 py-1 text-xs"
                            :class="mock.device === 'desktop' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'"
                            @click="mock.device = 'desktop'"><mock-icon name="monitor" :size="14"></mock-icon>{{ mock.t.desktop }}</button>
                        <button type="button" class="flex items-center gap-1 rounded px-2 py-1 text-xs"
                            :class="mock.device === 'mobile' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'"
                            @click="mock.device = 'mobile'"><mock-icon name="smartphone" :size="14"></mock-icon>{{ mock.t.mobile }}</button>
                    </div>
                    <button type="button" class="flex items-center gap-1 rounded-md bg-white px-2 py-1 text-xs text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100"
                        @click="mock.reset()"><mock-icon name="rotate-ccw" :size="14"></mock-icon>{{ mock.t.reset }}</button>
                </div>
            </div>
        </header>
    `,
})
