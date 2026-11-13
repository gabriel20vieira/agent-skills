// MockModal: a modal for mocks, used instead of alert() and confirm().
//   <mock-modal v-model:open="state.confirmOpen" title="Delete?" @confirm="...">Text</mock-modal>
// Without a footer slot it shows Cancel and Confirm; `confirm-text` and `tone` change the main button.
import { defineComponent, onBeforeUnmount, watch } from "vue"
import { useMock } from "../kit.js"

export default defineComponent({
    name: "MockModal",
    props: {
        open: { type: Boolean, default: false },
        title: { type: String, default: "" },
        confirmText: { type: String, default: "" },
        tone: { type: String, default: "primary" },
    },
    emits: ["update:open", "confirm", "cancel"],
    setup(props, { emit }) {
        const mock = useMock()
        const close = () => {
            emit("update:open", false)
            emit("cancel")
        }
        const confirm = () => {
            emit("confirm")
            emit("update:open", false)
        }
        const onKey = (event) => {
            if (event.key === "Escape" && props.open) close()
        }
        watch(() => props.open, (open) => {
            if (open) window.addEventListener("keydown", onKey)
            else window.removeEventListener("keydown", onKey)
        }, { immediate: true })
        onBeforeUnmount(() => window.removeEventListener("keydown", onKey))
        return { mock, close, confirm }
    },
    template: `
        <teleport to="body">
            <div v-if="open" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" @click.self="close">
                <div role="dialog" aria-modal="true" class="w-full max-w-md rounded-xl bg-white p-6 text-foreground shadow-xl font-sans">
                    <div class="mb-3 flex items-start justify-between gap-4">
                        <h2 class="text-lg font-semibold">{{ title }}</h2>
                        <button type="button" class="text-slate-400 hover:text-slate-700" :aria-label="mock.t.close" @click="close">
                            <mock-icon name="x" :size="18"></mock-icon>
                        </button>
                    </div>
                    <div class="text-sm text-slate-700"><slot></slot></div>
                    <div class="mt-6 flex justify-end gap-2">
                        <slot name="footer" :close="close" :confirm="confirm">
                            <button type="button" class="rounded-md px-4 py-2 text-sm text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50" @click="close">{{ mock.t.cancel }}</button>
                            <button type="button" class="rounded-md px-4 py-2 text-sm font-medium"
                                :class="tone === 'destructive' ? 'bg-destructive text-white' : 'bg-primary text-primary-foreground'"
                                @click="confirm">{{ confirmText || mock.t.confirm }}</button>
                        </slot>
                    </div>
                </div>
            </div>
        </teleport>
    `,
})
