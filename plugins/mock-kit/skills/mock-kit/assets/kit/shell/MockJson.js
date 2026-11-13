// MockJson: a JSON tree with search and collapsible objects and arrays. The bar's "State" panel
// uses it for the simulated state; a mock can use it too: <mock-json :value="data"></mock-json>.
import { computed, defineComponent, reactive, ref } from "vue"
import { useMock } from "../kit.js"
import { containerPaths, highlight, jsonRows } from "./jsonTree.js"

const TYPE_CLASS = { string: "text-emerald-700", number: "text-sky-700", boolean: "text-violet-700", null: "text-slate-400", undefined: "text-slate-400" }

export default defineComponent({
    name: "MockJson",
    props: {
        value: { required: true },
    },
    setup(props) {
        const mock = useMock()
        const query = ref("")
        const collapsed = reactive(new Set())
        const rows = computed(() => jsonRows(props.value, { collapsed, query: query.value }))
        const hits = computed(() => rows.value.filter((row) => row.hit).length)
        const toggle = (path) => (collapsed.has(path) ? collapsed.delete(path) : collapsed.add(path))
        const expandAll = () => collapsed.clear()
        const collapseAll = () => {
            collapsed.clear()
            for (const path of containerPaths(props.value)) collapsed.add(path)
        }
        const parts = (text) => highlight(String(text), query.value)
        return { mock, query, rows, hits, toggle, expandAll, collapseAll, parts, TYPE_CLASS }
    },
    template: `
        <div class="flex min-h-0 flex-col text-xs">
            <div class="flex items-center gap-1 border-b border-slate-200 px-3 py-2">
                <label class="flex min-w-0 flex-1 items-center gap-1 rounded-md px-2 py-1 ring-1 ring-slate-200 focus-within:ring-slate-400">
                    <mock-icon name="search" :size="12"></mock-icon>
                    <input v-model="query" type="search" class="min-w-0 flex-1 bg-transparent outline-none" :placeholder="mock.t.search" :aria-label="mock.t.search">
                </label>
                <span v-if="query" class="shrink-0 tabular-nums text-slate-500">{{ hits }} {{ mock.t.matches }}</span>
                <button type="button" class="rounded-md p-1 text-slate-500 hover:text-slate-900" :title="mock.t.expandAll" :aria-label="mock.t.expandAll" @click="expandAll"><mock-icon name="chevrons-up-down" :size="14"></mock-icon></button>
                <button type="button" class="rounded-md p-1 text-slate-500 hover:text-slate-900" :title="mock.t.collapseAll" :aria-label="mock.t.collapseAll" @click="collapseAll"><mock-icon name="chevrons-down-up" :size="14"></mock-icon></button>
            </div>
            <div class="max-h-[60vh] overflow-auto py-2 font-mono leading-5" role="tree">
                <p v-if="!rows.length" class="px-3 text-slate-500">{{ mock.t.noMatches }}</p>
                <div v-for="row in rows" :key="row.path" class="flex items-start whitespace-pre pr-3 hover:bg-slate-50" :style="{ paddingLeft: (12 + row.depth * 14) + 'px' }">
                    <button v-if="row.container && !query" type="button" class="-ml-4 w-4 shrink-0 text-slate-400 hover:text-slate-900" :aria-expanded="row.open ? 'true' : 'false'" @click="toggle(row.path)">
                        <mock-icon :name="row.open ? 'chevron-down' : 'chevron-right'" :size="12"></mock-icon>
                    </button>
                    <span v-if="row.key !== null" :class="typeof row.key === 'number' ? 'text-slate-400' : 'text-slate-800'"><template v-for="(part, at) in parts(row.key)" :key="at"><mark v-if="part.match && typeof row.key !== 'number'" class="rounded-sm bg-amber-200 text-inherit">{{ part.text }}</mark><template v-else>{{ part.text }}</template></template>: </span>
                    <span v-if="row.close" class="text-slate-500">{{ row.close }}</span>
                    <span v-else-if="row.container" class="text-slate-500">
                        <template v-if="row.open">{{ row.brackets[0] }}</template>
                        <button v-else type="button" class="hover:text-slate-900" @click="toggle(row.path)">{{ row.brackets[0] }}…{{ row.brackets[1] }} <span class="text-slate-400">{{ row.count }} {{ row.brackets[0] === '[' ? mock.t.items : mock.t.keys }}</span></button>
                    </span>
                    <span v-else :class="TYPE_CLASS[row.type]" class="whitespace-pre-wrap break-all"><template v-for="(part, at) in parts(row.text)" :key="at"><mark v-if="part.match" class="rounded-sm bg-amber-200 text-inherit">{{ part.text }}</mark><template v-else>{{ part.text }}</template></template></span>
                </div>
            </div>
        </div>
    `,
})
