import { describe, expect, it } from "vitest"
import { createTopicRefs, reconnectDelay } from "../../app/utils/realtime"

describe("reconnectDelay", () => {
    it("grows exponentially from 1s and caps at 30s", () => {
        expect(reconnectDelay(0, 0)).toBe(1000)
        expect(reconnectDelay(1, 0)).toBe(2000)
        expect(reconnectDelay(4, 0)).toBe(16000)
        expect(reconnectDelay(10, 0)).toBe(30000)
    })
    it("adds up to 30% jitter so clients do not reconnect in lockstep", () => {
        expect(reconnectDelay(0, 0.999)).toBe(1300)
        expect(reconnectDelay(10, 1)).toBe(39000)
    })
})

describe("createTopicRefs", () => {
    it("reports the first subscriber and the last one leaving", () => {
        const refs = createTopicRefs()
        expect(refs.add("res:notes")).toBe(true)
        expect(refs.add("res:notes")).toBe(false)
        expect(refs.remove("res:notes")).toBe(false)
        expect(refs.remove("res:notes")).toBe(true)
        expect(refs.remove("res:notes")).toBe(false)
    })
    it("lists active topics for resubscription", () => {
        const refs = createTopicRefs()
        refs.add("a")
        refs.add("b")
        refs.remove("a")
        expect(refs.topics()).toEqual(["b"])
    })
})
