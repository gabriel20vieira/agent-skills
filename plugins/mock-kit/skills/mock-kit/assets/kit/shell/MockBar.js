// MockBar: the "MOCK" strip, in two rows.
// Row 1: the title; on the right the simulated clock (optional), the screens (desktop, tablet,
// mobile, always shown) with "State" (the simulated state as a JSON tree with search and
// collapsible objects and arrays), and "Reset".
// Row 2 (when there are any): the variant tabs, with the options of the selected variant next to
// it (only that variant's), and "Where": where each of those options acts, with "Go".
import { computed, defineComponent } from "vue"
import { DEVICES, useMock } from "../kit.js"

const DEVICE_ICONS = { desktop: "monitor", tablet: "tablet", mobile: "smartphone" }

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
        const options = computed(() => mock.optionsOf[mock.variant] ?? [])
        const on = (id) => Boolean(mock.enabled[mock.variant]?.[id])
        const toggle = (name) => { mock.panel = mock.panel === name ? null : name }
        return { mock, hasVariants, options, on, toggle, shift, DEVICES, DEVICE_ICONS }
    },
    template: `
        <header class="sticky top-0 z-40 border-b border-amber-200 bg-amber-50/95 backdrop-blur" @keydown.esc="mock.panel = null">
            <div class="relative mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-2 text-sm text-slate-700">
                <span class="rounded bg-amber-400 px-2 py-0.5 text-xs font-bold tracking-widest text-amber-950">{{ mock.t.mock }}</span>
                <span class="font-medium text-slate-900">{{ title }}</span>
                <div class="ml-auto flex flex-wrap items-center gap-2">
                    <div v-if="mock.clock" class="flex items-center gap-1 rounded-md bg-white px-2 py-1 ring-1 ring-slate-200" :title="mock.t.clock">
                        <mock-icon name="clock" :size="14"></mock-icon>
                        <button type="button" class="px-1 text-slate-500 hover:text-slate-900" @click="mock.clock = shift(mock.clock, -15)">-15</button>
                        <span class="font-mono text-xs tabular-nums text-slate-900">{{ mock.clock }}</span>
                        <button type="button" class="px-1 text-slate-500 hover:text-slate-900" @click="mock.clock = shift(mock.clock, 15)">+15</button>
                    </div>
                    <div class="flex items-center rounded-md bg-white p-0.5 ring-1 ring-slate-200">
                        <button v-for="device in DEVICES" :key="device" type="button" class="flex items-center gap-1 rounded px-2 py-1 text-xs"
                            :class="mock.device === device ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'"
                            @click="mock.device = device"><mock-icon :name="DEVICE_ICONS[device]" :size="14"></mock-icon>{{ mock.t[device] }}</button>
                        <span class="mx-0.5 h-5 w-px bg-slate-200" aria-hidden="true"></span>
                        <button type="button" class="flex items-center gap-1 rounded px-2 py-1 text-xs" :aria-expanded="mock.panel === 'state' ? 'true' : 'false'"
                            :class="mock.panel === 'state' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'"
                            @click="toggle('state')"><mock-icon name="braces" :size="14"></mock-icon>{{ mock.t.stateShort }}</button>
                    </div>
                    <button type="button" class="flex items-center gap-1 rounded-md bg-white px-2 py-1 text-xs text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100"
                        @click="mock.reset()"><mock-icon name="rotate-ccw" :size="14"></mock-icon>{{ mock.t.reset }}</button>
                </div>
                <div v-if="hasVariants || options.length" class="flex basis-full flex-wrap items-center justify-end gap-2">
                    <nav class="flex flex-wrap items-center gap-1" :aria-label="mock.t.variant">
                        <template v-for="name in mock.variants" :key="name">
                            <div class="flex flex-wrap items-center gap-1 rounded-lg" :class="name === mock.variant && options.length ? 'bg-white p-0.5 pr-1 ring-1 ring-slate-200' : ''">
                                <button v-if="hasVariants" type="button"
                                    class="rounded-md px-2.5 py-1 text-xs font-semibold transition"
                                    :class="mock.variant === name ? 'bg-slate-900 text-white' : 'bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100'"
                                    @click="mock.variant = name">{{ mock.t.variant }} {{ name }}</button>
                                <div v-if="name === mock.variant && options.length" class="flex flex-wrap items-center gap-1" role="group" :aria-label="mock.t.options">
                                    <button v-for="option in options" :key="option.id" type="button" :aria-pressed="on(option.id) ? 'true' : 'false'"
                                        class="flex items-center gap-1 rounded-full px-2.5 py-1 text-xs transition"
                                        :class="on(option.id) ? 'bg-emerald-600 text-white' : 'bg-white text-slate-500 ring-1 ring-slate-200 hover:text-slate-900'"
                                        @click="mock.toggleOption(option.id)">
                                        <mock-icon :name="on(option.id) ? 'check' : 'plus'" :size="12"></mock-icon>{{ option.label }}
                                    </button>
                                </div>
                            </div>
                        </template>
                    </nav>
                    <button v-if="options.length" type="button" class="flex items-center gap-1 rounded-md px-2 py-1 text-xs ring-1 ring-slate-200" :aria-expanded="mock.panel === 'where' ? 'true' : 'false'"
                        :class="mock.panel === 'where' ? 'bg-slate-900 text-white' : 'bg-white text-slate-700 hover:bg-slate-100'"
                        @click="toggle('where')"><mock-icon name="map-pin" :size="14"></mock-icon>{{ mock.t.where }}</button>
                </div>
                <div v-if="mock.panel === 'state'" class="absolute right-4 top-full z-50 mt-1 w-[min(28rem,calc(100vw-2rem))] rounded-xl bg-white text-left shadow-lg ring-1 ring-slate-200">
                    <div class="flex items-center justify-between gap-2 border-b border-slate-200 px-3 py-2">
                        <span class="text-xs font-semibold text-slate-900">{{ mock.t.state }}</span>
                        <div class="flex items-center gap-1">
                            <button type="button" class="rounded-md px-2 py-1 text-xs text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100" @click="mock.reset()">{{ mock.t.reset }}</button>
                            <button type="button" class="rounded-md p-1 text-slate-500 hover:text-slate-900" :aria-label="mock.t.close" @click="mock.panel = null"><mock-icon name="x" :size="14"></mock-icon></button>
                        </div>
                    </div>
                    <mock-json :value="mock.state"></mock-json>
                </div>
                <div v-if="mock.panel === 'where' && options.length" class="absolute right-4 top-full z-50 mt-1 w-[min(32rem,calc(100vw-2rem))] rounded-xl bg-white text-left text-xs shadow-lg ring-1 ring-slate-200">
                    <div class="flex items-center justify-between gap-2 border-b border-slate-200 px-3 py-2">
                        <span class="font-semibold text-slate-900">{{ mock.t.whereTitle }} {{ mock.variant }}</span>
                        <button type="button" class="rounded-md p-1 text-slate-500 hover:text-slate-900" :aria-label="mock.t.close" @click="mock.panel = null"><mock-icon name="x" :size="14"></mock-icon></button>
                    </div>
                    <ul class="max-h-[60vh] divide-y divide-slate-100 overflow-auto">
                        <li v-for="option in options" :key="option.id" class="flex flex-wrap items-center gap-2 px-3 py-2">
                            <button type="button" :aria-pressed="on(option.id) ? 'true' : 'false'"
                                class="flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 transition"
                                :class="on(option.id) ? 'bg-emerald-600 text-white' : 'bg-white text-slate-500 ring-1 ring-slate-200 hover:text-slate-900'"
                                @click="mock.toggleOption(option.id)">
                                <mock-icon :name="on(option.id) ? 'check' : 'plus'" :size="12"></mock-icon>{{ option.label }}
                            </button>
                            <span v-if="option.where.length" class="flex min-w-0 flex-1 flex-wrap items-center gap-0.5 text-slate-700">
                                <template v-for="(part, at) in option.where" :key="at">
                                    <mock-icon v-if="at" name="chevron-right" :size="12" class="text-slate-400"></mock-icon>
                                    <span :class="at === option.where.length - 1 ? 'font-medium text-slate-900' : ''">{{ part }}</span>
                                </template>
                            </span>
                            <span v-else class="min-w-0 flex-1 italic text-slate-400">{{ mock.t.whereNone }}</span>
                            <span v-if="mock.here[option.id]" class="flex shrink-0 items-center gap-1 rounded-full bg-sky-50 px-2 py-0.5 text-sky-700 ring-1 ring-sky-200">
                                <mock-icon name="eye" :size="12"></mock-icon>{{ mock.t.whereHere }}
                            </span>
                            <button v-if="option.go" type="button" class="flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100"
                                @click="mock.goTo(option)">{{ mock.t.whereGo }}<mock-icon name="arrow-right" :size="12"></mock-icon></button>
                        </li>
                    </ul>
                </div>
            </div>
        </header>
    `,
})
