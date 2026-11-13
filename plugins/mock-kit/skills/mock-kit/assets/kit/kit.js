// mock-kit runtime: createMock() mounts a mock page with the shell and the project's components.
// Versions of Vue, Tailwind and Lucide live in versions.json and reach the page through the
// head block that `mock-kit.mjs index` writes into every mock.
import { createApp, inject, reactive } from "vue"
import shell from "./shell/index.js"

export const STRINGS = {
    "pt-PT": {
        mock: "MOCK",
        desktop: "Computador",
        tablet: "Tablet",
        mobile: "Telemóvel",
        reset: "Repor",
        variant: "Variante",
        options: "Opções",
        close: "Fechar",
        cancel: "Cancelar",
        confirm: "Confirmar",
        state: "Estado simulado",
        clock: "Hora simulada",
    },
    "en-US": {
        mock: "MOCK",
        desktop: "Desktop",
        tablet: "Tablet",
        mobile: "Mobile",
        reset: "Reset",
        variant: "Variant",
        options: "Options",
        close: "Close",
        cancel: "Cancel",
        confirm: "Confirm",
        state: "Simulated state",
        clock: "Simulated time",
    },
}

const MOCK = Symbol("mock")

export const DEVICES = ["desktop", "tablet", "mobile"]

/** Options of one variant as [{ id, label, default }]; plain strings are on by default. */
function normaliseOptions(list = []) {
    return list.map((item) => (typeof item === "string" ? { id: item, label: item, default: true } : { label: item.id, default: true, ...item }))
}

/** The mock context: variant, options, device, simulated state, toasts and texts. */
export function useMock() {
    return inject(MOCK)
}

/**
 * Mounts the mock on #app.
 * - variants: ["A", "B"]; the first is active unless ?variant= says otherwise.
 * - options: { A: ["X", "Y"], B: ["Y", { id: "Z", label: "Z", default: false }] }: independent
 *   on/off choices per variant, shown in MockBar; use option("X") or <mock-option name="X">.
 *   ?options=X,Y turns exactly those on (for screenshots).
 * - state: () => ({ ... }); available as `state` in templates, restored by "Reset".
 * - components: the project's components used by this mock.
 * - clock: "09:00" to start the simulated clock shown in MockBar.
 * - anything else (data, computed, methods, setup) goes to the root component.
 */
export function createMock(config = {}) {
    const { variants = ["A"], options = {}, state: initial = () => ({}), components = {}, clock = null, setup, ...root } = config
    const params = new URLSearchParams(location.search)
    const lang = document.documentElement.lang in STRINGS ? document.documentElement.lang : "pt-PT"
    const mock = reactive({
        variants,
        variant: variants.includes(params.get("variant")) ? params.get("variant") : variants[0],
        device: DEVICES.includes(params.get("device")) ? params.get("device") : "desktop",
        shot: params.has("shot"),
        clock,
        state: initial(),
        toasts: [],
        t: STRINGS[lang],
        lang,
    })
    mock.optionsOf = Object.fromEntries(variants.map((name) => [name, normaliseOptions(options[name])]))
    const forced = params.has("options") ? new Set(params.get("options").split(",").filter(Boolean)) : null
    mock.enabled = {}
    for (const option of Object.values(mock.optionsOf).flat()) {
        mock.enabled[option.id] = forced ? forced.has(option.id) : (mock.enabled[option.id] ?? option.default)
    }
    /** Whether an option is on for the active variant. */
    mock.option = (id) => mock.optionsOf[mock.variant]?.some((option) => option.id === id) && Boolean(mock.enabled[id])
    let nextToast = 1
    mock.toast = (message, tone = "info") => {
        const id = nextToast++
        mock.toasts.push({ id, message, tone })
        setTimeout(() => {
            const at = mock.toasts.findIndex((toast) => toast.id === id)
            if (at >= 0) mock.toasts.splice(at, 1)
        }, 3000)
    }
    mock.reset = () => {
        const fresh = initial()
        for (const key of Object.keys(mock.state)) delete mock.state[key]
        Object.assign(mock.state, fresh)
        mock.toasts.splice(0)
        mock.clock = clock
    }
    const app = createApp({
        ...root,
        setup(props, context) {
            const extra = setup ? setup(props, context) ?? {} : {}
            return { mock, state: mock.state, toast: mock.toast, option: mock.option, ...extra }
        },
    })
    app.provide(MOCK, mock)
    for (const [name, component] of Object.entries({ ...shell, ...components })) app.component(name, component)
    app.config.errorHandler = (error) => {
        console.error(error)
        mock.toast(String(error?.message ?? error), "error")
    }
    app.mount("#app")
    return app
}
