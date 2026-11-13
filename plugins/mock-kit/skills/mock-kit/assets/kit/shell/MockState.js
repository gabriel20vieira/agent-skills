// MockState: the simulated state as JSON, with "Reset". Useful while iterating on a mock.
import { computed, defineComponent, ref } from "vue"
import { useMock } from "../kit.js"

export default defineComponent({
    name: "MockState",
    setup() {
        const mock = useMock()
        const open = ref(false)
        const json = computed(() => JSON.stringify(mock.state, null, 2))
        return { mock, open, json }
    },
    template: `
        <section class="mx-auto w-full max-w-3xl rounded-xl bg-white text-sm ring-1 ring-slate-200">
            <div class="flex items-center justify-between px-4 py-2">
                <button type="button" class="flex items-center gap-1 font-medium text-slate-700" @click="open = !open">
                    <mock-icon :name="open ? 'chevron-down' : 'chevron-right'" :size="14"></mock-icon>{{ mock.t.state }}
                </button>
                <button type="button" class="rounded-md px-2 py-1 text-xs text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100" @click="mock.reset()">{{ mock.t.reset }}</button>
            </div>
            <pre v-if="open" class="overflow-x-auto border-t border-slate-200 px-4 py-3 text-xs text-slate-700">{{ json }}</pre>
        </section>
    `,
})
