import type { AuthUser } from "#shared/types/auth"
import type { ServerMessage } from "#shared/utils/realtimeProtocol"
import { authorizeTopic, parseClientMessage, SYSTEM_TOPIC, userTopic } from "#shared/utils/realtimeProtocol"

/** The slice of a WebSocket peer the hub needs; crossws peers satisfy it. */
export interface RealtimePeer {
    id: string
    send(text: string): void
    close(code?: number, reason?: string): void
}

interface PeerState {
    peer: RealtimePeer
    user: AuthUser
    sid: string
    topics: Set<string>
    lastSeen: number
}

/** Close codes (4000-4999 are application-defined). */
export const CLOSE_UNAUTHORIZED = 4401
export const CLOSE_IDLE = 4408

/**
 * In-memory pub/sub for one instance. Pure (no crossws), so it is unit-tested with fake
 * peers; several instances would put a Redis adapter behind this same interface.
 */
export function createRealtimeHub(options: { idleMs?: number } = {}) {
    const idleMs = options.idleMs ?? 60_000
    const peers = new Map<string, PeerState>()
    const topics = new Map<string, Set<string>>()

    function send(state: PeerState, message: ServerMessage) {
        try {
            state.peer.send(JSON.stringify(message))
        }
        catch {
            // The socket is going away; close() will clean it up.
        }
    }

    function join(state: PeerState, topic: string) {
        state.topics.add(topic)
        let members = topics.get(topic)
        if (!members) topics.set(topic, members = new Set())
        members.add(state.peer.id)
    }

    function leave(state: PeerState, topic: string) {
        state.topics.delete(topic)
        const members = topics.get(topic)
        members?.delete(state.peer.id)
        if (members?.size === 0) topics.delete(topic)
    }

    function remove(peer: RealtimePeer) {
        const state = peers.get(peer.id)
        if (!state) return
        for (const topic of [...state.topics]) leave(state, topic)
        peers.delete(peer.id)
    }

    function evict(state: PeerState, code: number, reason: string) {
        remove(state.peer)
        state.peer.close(code, reason)
    }

    function event(topic: string, name: string, data: unknown): ServerMessage {
        return { type: "event", topic, event: name, data, ts: Date.now() }
    }

    return {
        add(peer: RealtimePeer, auth: { user: AuthUser, sid: string }, now = Date.now()) {
            const state: PeerState = { peer, user: auth.user, sid: auth.sid, topics: new Set(), lastSeen: now }
            peers.set(peer.id, state)
            join(state, userTopic(auth.user.id))
            join(state, SYSTEM_TOPIC)
            send(state, { type: "ready" })
        },

        remove,

        touch(peer: RealtimePeer, now = Date.now()) {
            const state = peers.get(peer.id)
            if (state) state.lastSeen = now
        },

        handle(peer: RealtimePeer, raw: string, now = Date.now()) {
            const state = peers.get(peer.id)
            if (!state) return
            state.lastSeen = now
            const message = parseClientMessage(raw)
            if (!message) return send(state, { type: "error", code: "realtime.bad_message" })
            if (message.type === "ping") return send(state, { type: "pong" })
            if (message.type === "unsubscribe") {
                leave(state, message.topic)
                return send(state, { type: "unsubscribed", topic: message.topic })
            }
            if (!authorizeTopic(state.user, message.topic)) {
                return send(state, { type: "error", code: "auth.forbidden", topic: message.topic })
            }
            join(state, message.topic)
            send(state, { type: "subscribed", topic: message.topic })
        },

        /** Call after the transaction committed; `data` should be ids, not records. */
        publish(topic: string, name: string, data: unknown = {}) {
            const message = event(topic, name, data)
            for (const id of topics.get(topic) ?? []) {
                const state = peers.get(id)
                if (state) send(state, message)
            }
        },

        publishToUser(userId: number, name: string, data: unknown = {}) {
            this.publish(userTopic(userId), name, data)
        },

        disconnectSessions(sids: readonly string[]) {
            const wanted = new Set(sids)
            for (const state of [...peers.values()]) {
                if (!wanted.has(state.sid)) continue
                send(state, event(userTopic(state.user.id), "session.revoked", {}))
                evict(state, CLOSE_UNAUTHORIZED, "session revoked")
            }
        },

        /** New roles drop topics that are no longer readable; null (deactivated) closes. */
        refreshUser(userId: number, user: AuthUser | null) {
            for (const state of [...peers.values()]) {
                if (state.user.id !== userId) continue
                if (!user) {
                    evict(state, CLOSE_UNAUTHORIZED, "access removed")
                    continue
                }
                state.user = user
                for (const topic of [...state.topics]) {
                    if (!authorizeTopic(user, topic)) leave(state, topic)
                }
            }
        },

        sweep(now = Date.now()) {
            for (const state of [...peers.values()]) {
                if (now - state.lastSeen > idleMs) evict(state, CLOSE_IDLE, "idle")
            }
        },

        stats() {
            return { peers: peers.size, topics: topics.size }
        },
    }
}

export type RealtimeHub = ReturnType<typeof createRealtimeHub>
