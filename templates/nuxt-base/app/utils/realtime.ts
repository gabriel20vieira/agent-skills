/** Exponential backoff from 1s, capped at 30s, plus up to 30% jitter. */
export function reconnectDelay(attempt: number, random = Math.random()): number {
    const base = Math.min(30_000, 1000 * 2 ** attempt)
    return Math.round(base * (1 + 0.3 * random))
}

/** Reference counts per topic, so several components can follow the same topic. */
export function createTopicRefs() {
    const counts = new Map<string, number>()
    return {
        /** true when this is the first reference (subscribe on the server). */
        add(topic: string) {
            const next = (counts.get(topic) ?? 0) + 1
            counts.set(topic, next)
            return next === 1
        },
        /** true when this was the last reference (unsubscribe on the server). */
        remove(topic: string) {
            const current = counts.get(topic)
            if (!current) return false
            if (current === 1) {
                counts.delete(topic)
                return true
            }
            counts.set(topic, current - 1)
            return false
        },
        topics: () => [...counts.keys()],
    }
}
