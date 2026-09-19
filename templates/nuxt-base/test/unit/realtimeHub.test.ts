import { describe, expect, it } from "vitest"
import { createRealtimeHub } from "../../server/utils/realtimeHub"
import type { RealtimePeer } from "../../server/utils/realtimeHub"
import type { AuthUser } from "#shared/types/auth"
import type { Role } from "#shared/utils/permissions"

function user(id: number, roles: Role[]): AuthUser {
    return {
        id,
        name: "U",
        email: "u@x.pt",
        roles,
        effectiveRoles: roles,
        mimicking: false,
        passwordVersion: 1,
        mustChangePassword: false,
        locale: null,
        theme: null,
    }
}

function fakePeer(id: string) {
    const sent: any[] = []
    const peer: RealtimePeer & { sent: any[], closed?: { code?: number, reason?: string } } = {
        id,
        sent,
        send: text => void sent.push(JSON.parse(text)),
        close(code, reason) {
            peer.closed = { code, reason }
        },
    }
    return peer
}

const events = (peer: { sent: any[] }) => peer.sent.filter(message => message.type === "event").map(message => message.event)

describe("realtime hub", () => {
    it("greets on add and auto-subscribes the user topic and system", () => {
        const hub = createRealtimeHub()
        const peer = fakePeer("a")
        hub.add(peer, { user: user(1, ["user"]), sid: "s1" })
        expect(peer.sent[0]).toEqual({ type: "ready" })
        hub.publishToUser(1, "user.updated", {})
        hub.publish("system", "system.maintenance", { enabled: true })
        expect(events(peer)).toEqual(["user.updated", "system.maintenance"])
    })

    it("delivers topic events only to subscribers", () => {
        const hub = createRealtimeHub()
        const reader = fakePeer("a")
        const other = fakePeer("b")
        hub.add(reader, { user: user(1, ["user"]), sid: "s1" })
        hub.add(other, { user: user(2, ["user"]), sid: "s2" })
        hub.handle(reader, JSON.stringify({ type: "subscribe", topic: "res:notes" }))
        hub.publish("res:notes", "notes.created", { id: 1 })
        expect(events(reader)).toEqual(["notes.created"])
        expect(events(other)).toEqual([])
        hub.handle(reader, JSON.stringify({ type: "unsubscribe", topic: "res:notes" }))
        hub.publish("res:notes", "notes.created", { id: 2 })
        expect(events(reader)).toEqual(["notes.created"])
    })

    it("refuses unauthorized subscriptions and bad messages", () => {
        const hub = createRealtimeHub()
        const peer = fakePeer("a")
        hub.add(peer, { user: user(1, ["user"]), sid: "s1" })
        hub.handle(peer, JSON.stringify({ type: "subscribe", topic: "res:users" }))
        hub.handle(peer, "garbage")
        expect(peer.sent.slice(1)).toEqual([
            { type: "error", code: "auth.forbidden", topic: "res:users" },
            { type: "error", code: "realtime.bad_message" },
        ])
        hub.publish("res:users", "users.created", {})
        expect(events(peer)).toEqual([])
    })

    it("answers ping", () => {
        const hub = createRealtimeHub()
        const peer = fakePeer("a")
        hub.add(peer, { user: user(1, ["user"]), sid: "s1" })
        hub.handle(peer, JSON.stringify({ type: "ping" }))
        expect(peer.sent.at(-1)).toEqual({ type: "pong" })
    })

    it("tells revoked sessions and closes them", () => {
        const hub = createRealtimeHub()
        const revoked = fakePeer("a")
        const kept = fakePeer("b")
        hub.add(revoked, { user: user(1, ["user"]), sid: "s1" })
        hub.add(kept, { user: user(1, ["user"]), sid: "s2" })
        hub.disconnectSessions(["s1"])
        expect(events(revoked)).toEqual(["session.revoked"])
        expect(revoked.closed?.code).toBe(4401)
        expect(kept.closed).toBeUndefined()
        expect(hub.stats().peers).toBe(1)
    })

    it("drops topics a user can no longer read, and closes when access is gone", () => {
        const hub = createRealtimeHub()
        const peer = fakePeer("a")
        hub.add(peer, { user: user(1, ["admin"]), sid: "s1" })
        hub.handle(peer, JSON.stringify({ type: "subscribe", topic: "res:users" }))
        hub.refreshUser(1, user(1, ["user"]))
        hub.publish("res:users", "users.updated", {})
        expect(events(peer)).toEqual([])
        hub.refreshUser(1, null)
        expect(peer.closed?.code).toBe(4401)
    })

    it("closes idle peers on sweep", () => {
        const hub = createRealtimeHub({ idleMs: 1000 })
        const idle = fakePeer("a")
        const active = fakePeer("b")
        hub.add(idle, { user: user(1, ["user"]), sid: "s1" }, 0)
        hub.add(active, { user: user(2, ["user"]), sid: "s2" }, 0)
        hub.touch(active, 900)
        hub.sweep(1500)
        expect(idle.closed?.code).toBe(4408)
        expect(active.closed).toBeUndefined()
    })

    it("forgets removed peers", () => {
        const hub = createRealtimeHub()
        const peer = fakePeer("a")
        hub.add(peer, { user: user(1, ["user"]), sid: "s1" })
        hub.remove(peer)
        hub.publishToUser(1, "user.updated", {})
        expect(events(peer)).toEqual([])
        expect(hub.stats()).toEqual({ peers: 0, topics: 0 })
    })
})
