import type { ServerMessage } from "#shared/utils/realtimeProtocol"

type EventMessage = Extract<ServerMessage, { type: "event" }>
// Payloads are small id objects; handlers narrow them themselves.
export type RealtimeHandler = (data: any, message: EventMessage) => void // eslint-disable-line @typescript-eslint/no-explicit-any
export type RealtimeStatus = "idle" | "connecting" | "open" | "closed"

const PING_MS = 25_000

/**
 * One WebSocket per tab, open while signed in. Reconnects with backoff, resubscribes its
 * topics, and emits "ready" after every (re)connect so views can refetch what they missed.
 */
export default defineNuxtPlugin(() => {
    const status = ref<RealtimeStatus>("idle")
    const refs = createTopicRefs()
    const handlers = new Map<string, Set<RealtimeHandler>>()
    const session = useSession()
    const publicSettings = usePublicSettings()
    const router = useRouter()

    let socket: WebSocket | null = null
    let wanted = false
    let attempt = 0
    let retryTimer: ReturnType<typeof setTimeout> | undefined
    let pingTimer: ReturnType<typeof setInterval> | undefined

    function emit(name: string, data: unknown, message: EventMessage) {
        for (const key of [name, "*"]) handlers.get(key)?.forEach(handler => handler(data, message))
    }

    function send(message: object) {
        if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify(message))
    }

    function connect() {
        if (!wanted || socket) return
        clearTimeout(retryTimer)
        status.value = "connecting"
        const ws = new WebSocket(`${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/_ws`)
        socket = ws
        ws.onopen = () => {
            pingTimer = setInterval(() => send({ type: "ping" }), PING_MS)
        }
        ws.onmessage = (incoming) => {
            let message: ServerMessage
            try {
                message = JSON.parse(String(incoming.data))
            }
            catch {
                return
            }
            if (message.type === "ready") {
                status.value = "open"
                attempt = 0
                for (const topic of refs.topics()) send({ type: "subscribe", topic })
                emit("ready", {}, { type: "event", topic: "", event: "ready", data: {}, ts: Date.now() })
            }
            else if (message.type === "event") {
                emit(message.event, message.data, message)
            }
        }
        ws.onclose = (closed) => {
            clearInterval(pingTimer)
            socket = null
            status.value = "closed"
            // 4401: the server revoked this session; do not hammer it with reconnects.
            if (closed.code === 4401) wanted = false
            if (wanted) retryTimer = setTimeout(connect, reconnectDelay(attempt++))
        }
    }

    function disconnect() {
        wanted = false
        clearTimeout(retryTimer)
        socket?.close(1000)
        socket = null
        status.value = "idle"
    }

    function on(name: string, handler: RealtimeHandler) {
        let set = handlers.get(name)
        if (!set) handlers.set(name, set = new Set())
        set.add(handler)
        return () => void set.delete(handler)
    }

    function subscribe(topic: string) {
        if (refs.add(topic)) send({ type: "subscribe", topic })
        return () => {
            if (refs.remove(topic)) send({ type: "unsubscribe", topic })
        }
    }

    watch(() => session.user.value?.id, (id) => {
        if (id) {
            wanted = true
            connect()
        }
        else {
            disconnect()
        }
    }, { immediate: true })

    // Waking a laptop or returning to the tab should not wait for the next backoff step.
    document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible" && wanted && !socket) {
            attempt = 0
            connect()
        }
    })

    // Core events.
    on("session.revoked", async () => {
        session.user.value = null
        await navigateTo("/entrar")
    })
    on("user.updated", () => session.refresh())
    on("settings.updated", () => publicSettings.refresh())
    on("system.maintenance", async () => {
        await publicSettings.refresh()
        const route = router.currentRoute.value
        // force re-runs the route middleware, which applies the maintenance redirect.
        await router.replace({ path: route.path, query: route.query, hash: route.hash, force: true })
    })

    return { provide: { realtime: { status: readonly(status), on, subscribe } } }
})
