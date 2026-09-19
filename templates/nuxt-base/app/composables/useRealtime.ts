import type { RealtimeHandler, RealtimeStatus } from "~/plugins/realtime.client"

const serverStub = {
    status: readonly(ref<RealtimeStatus>("idle")),
    on: (_name: string, _handler: RealtimeHandler) => () => {},
    subscribe: (_topic: string) => () => {},
}

/** The tab's realtime connection (a no-op during SSR). */
export function useRealtime() {
    return import.meta.client ? useNuxtApp().$realtime : serverStub
}

/** Listens to one event (or "*") for the lifetime of the calling component/scope. */
export function useRealtimeEvent(name: string, handler: RealtimeHandler) {
    const off = useRealtime().on(name, handler)
    if (getCurrentScope()) onScopeDispose(off)
    return off
}

/**
 * Keeps a view of a resource fresh: follows `res:<resource>[:<id>]` and calls refresh
 * (debounced) on any `<resource>.*` event and after every reconnect.
 */
export function useLiveResource(resource: Resource, refresh: () => unknown, options: { id?: number | string, debounceMs?: number } = {}) {
    if (import.meta.server) return
    const realtime = useRealtime()
    const topic = resourceTopic(resource, options.id)
    let timer: ReturnType<typeof setTimeout> | undefined
    const schedule = () => {
        clearTimeout(timer)
        timer = setTimeout(() => void refresh(), options.debounceMs ?? 300)
    }
    const offTopic = realtime.subscribe(topic)
    const offEvents = realtime.on("*", (_data, message) => {
        if (message.topic === topic && message.event.startsWith(`${resource}.`)) schedule()
    })
    const offReady = realtime.on("ready", schedule)
    if (getCurrentScope()) {
        onScopeDispose(() => {
            clearTimeout(timer)
            offTopic()
            offEvents()
            offReady()
        })
    }
}
