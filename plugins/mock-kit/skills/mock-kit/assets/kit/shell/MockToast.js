// MockToast: shows the messages sent with toast("...") or toast("...", "error" | "success").
import { defineComponent } from "vue"
import { useMock } from "../kit.js"

const TONES = {
    info: "bg-slate-900 text-white",
    success: "bg-emerald-600 text-white",
    error: "bg-red-600 text-white",
}

export default defineComponent({
    name: "MockToast",
    setup() {
        return { mock: useMock(), TONES }
    },
    template: `
        <div class="pointer-events-none fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2" aria-live="polite">
            <div v-for="toast in mock.toasts" :key="toast.id"
                class="pointer-events-auto rounded-lg px-4 py-2 text-sm shadow-lg" :class="TONES[toast.tone] || TONES.info">{{ toast.message }}</div>
        </div>
    `,
})
