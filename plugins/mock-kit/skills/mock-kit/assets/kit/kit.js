// mock-kit runtime: createMock() mounts a mock page with the shell and the project's components.
// Versions of Vue, Tailwind and Lucide live in versions.json and reach the page through the
// head block that `mock-kit.mjs index` writes into every mock.
import { createApp, inject, reactive, watch } from "vue"
import { applyChoice, chosenOptions, initialEnabled, normaliseOptions } from "./options.js"
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
        stateShort: "Estado",
        search: "Pesquisar",
        matches: "resultados",
        noMatches: "Sem resultados.",
        expandAll: "Expandir tudo",
        collapseAll: "Encolher tudo",
        keys: "chaves",
        items: "itens",
        clock: "Hora simulada",
        where: "Onde",
        whereTitle: "Onde atuam as opções da variante",
        whereHere: "neste ecrã",
        whereGo: "Ir",
        whereNone: "Local não indicado",
        whereWent: "Opção",
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
        stateShort: "State",
        search: "Search",
        matches: "matches",
        noMatches: "No matches.",
        expandAll: "Expand all",
        collapseAll: "Collapse all",
        keys: "keys",
        items: "items",
        clock: "Simulated time",
        where: "Where",
        whereTitle: "Where the options act in variant",
        whereHere: "on this screen",
        whereGo: "Go",
        whereNone: "No place given",
        whereWent: "Option",
    },
}

const MOCK = Symbol("mock")

export const DEVICES = ["desktop", "tablet", "mobile"]

/** Opens on the recorded choice (mocks.json) and records each change through the mock-kit server.
 * Skipped for screenshots, for URLs that force a variant or options, and outside http(s). */
function rememberChoice(mock, params) {
    if (mock.shot || !location.protocol.startsWith("http") || !mock.file.endsWith(".html")) return
    const forced = params.has("variant") || params.has("options")
    const record = () => {
        let timer = null
        watch(() => [mock.variant, ...mock.chosenOptions()].join("|"), () => {
            clearTimeout(timer)
            timer = setTimeout(() => {
                const body = JSON.stringify({ file: mock.file, variant: mock.variant, options: mock.chosenOptions() })
                fetch("./_kit/choice", { method: "POST", headers: { "content-type": "application/json" }, body }).catch(() => {})
            }, 300)
        })
    }
    if (forced) return record()
    fetch("./mocks.json", { cache: "no-store" })
        .then((res) => (res.ok ? res.json() : null))
        .then((registry) => {
            const choice = registry?.mocks?.find((entry) => entry.file === mock.file)?.choice
            if (choice && mock.variants.includes(choice.variant)) {
                mock.variant = choice.variant
                applyChoice(mock.enabled, mock.optionsOf, choice)
            }
        })
        .catch(() => {})
        .finally(record)
}

/** The mock context: variant, options, device, simulated state, toasts and texts. */
export function useMock() {
    return inject(MOCK)
}

/**
 * Mounts the mock on #app.
 * - variants: ["A", "B"]; the first is active unless ?variant= says otherwise.
 * - options: { A: ["X", { id: "Y", where: "Orders > Detail > Payment", go: (state) => { state.page = "detail" } }],
 *   B: [{ id: "Y", default: false, where: "Orders > List" }] }: independent on/off choices per
 *   variant, each variant with its own state, shown next to the selected variant in MockBar; use
 *   option("X") or <mock-option name="X">. where says where the option acts (the bar's "Where"
 *   panel lists it); go takes the mock there. ?options=X,Y turns exactly those on (screenshots).
 * - state: () => ({ ... }); available as `state` in templates, restored by "Reset".
 * - components: the project's components used by this mock.
 * - clock: "09:00" to start the simulated clock shown in MockBar.
 * The variant and options shown are the mock's choice: served by `mock-kit.mjs serve`, the page
 * opens on the recorded choice and records every change in mocks.json (`mock-kit.mjs choice`).
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
        file: decodeURIComponent(location.pathname.split("/").pop() || ""),
        panel: null,
        here: {},
        state: initial(),
        toasts: [],
        t: STRINGS[lang],
        lang,
    })
    mock.optionsOf = Object.fromEntries(variants.map((name) => [name, normaliseOptions(options[name])]))
    const forced = params.has("options") ? new Set(params.get("options").split(",").filter(Boolean)) : null
    mock.enabled = initialEnabled(mock.optionsOf, forced)
    /** Whether an option is on for the active variant. */
    mock.option = (id) => Boolean(mock.enabled[mock.variant]?.[id])
    /** Turns an option of the active variant on or off. */
    mock.toggleOption = (id) => {
        if (id in (mock.enabled[mock.variant] ?? {})) mock.enabled[mock.variant][id] = !mock.enabled[mock.variant][id]
    }
    /** The options on for the active variant, in their declared order. */
    mock.chosenOptions = () => chosenOptions(mock.optionsOf, mock.enabled, mock.variant)
    /** Takes the mock to where an option acts (its go), and says so. */
    mock.goTo = (option) => {
        option.go?.(mock.state, mock)
        mock.panel = null
        mock.toast(`${mock.t.whereWent} ${option.label}: ${option.where.join(" › ")}`)
    }
    rememberChoice(mock, params)
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
