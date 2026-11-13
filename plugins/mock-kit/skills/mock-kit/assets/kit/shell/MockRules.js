// MockRules: the numbered list of what this mock decides, matching the decisions of the summary
// shown to the user (Decision 1 here is decision 1 there).
import { defineComponent } from "vue"
import { useMock } from "../kit.js"

export default defineComponent({
    name: "MockRules",
    props: {
        rules: { type: Array, default: () => [] },
    },
    setup() {
        return { mock: useMock() }
    },
    template: `
        <section v-if="rules.length" class="mx-auto w-full max-w-3xl rounded-xl bg-white p-5 ring-1 ring-slate-200">
            <h2 class="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">{{ mock.t.rules }}</h2>
            <ol class="flex flex-col gap-2">
                <li v-for="(rule, index) in rules" :key="index" class="flex gap-3 text-sm text-slate-800">
                    <span class="flex size-6 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white"
                        :title="mock.t.decision + ' ' + (index + 1)">{{ index + 1 }}</span>
                    <span class="pt-0.5">{{ rule }}</span>
                </li>
            </ol>
        </section>
    `,
})
