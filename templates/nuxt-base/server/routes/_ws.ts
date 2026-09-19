/**
 * The single WebSocket endpoint, on the app's own port and origin. The session cookie
 * authenticates the upgrade; topics are authorised per subscription by the hub.
 */
const SWEEP_MS = 30_000

type Peer = Parameters<NonNullable<Parameters<typeof defineWebSocketHandler>[0]["open"]>>[0]

const globalKey = "__nuxtBaseRealtimeSweep" as const
const scope = globalThis as typeof globalThis & { [globalKey]?: ReturnType<typeof setInterval> }
scope[globalKey] ??= setInterval(() => realtime.sweep(), SWEEP_MS)

async function authenticate(target: Parameters<typeof getUserSession>[0]) {
    try {
        return await resolveSessionAuth(await getUserSession(target))
    }
    catch {
        return null
    }
}

function asRealtimePeer(peer: Peer) {
    return {
        id: peer.id,
        send: (text: string) => peer.send(text),
        close: (code?: number, reason?: string) => peer.close(code, reason),
    }
}

export default defineWebSocketHandler({
    async upgrade(request) {
        const auth = await authenticate(request as Parameters<typeof getUserSession>[0])
        // Throwing a Response aborts the upgrade with that status.
        if (!auth) throw new Response("Unauthorized", { status: 401 })
    },

    async open(peer) {
        const auth = await authenticate(peer as unknown as Parameters<typeof getUserSession>[0])
        if (!auth) {
            peer.close(4401, "unauthorized")
            return
        }
        realtime.add(asRealtimePeer(peer), { user: auth.user, sid: auth.sid })
    },

    message(peer, message) {
        realtime.handle(asRealtimePeer(peer), message.text())
    },

    close(peer) {
        realtime.remove(asRealtimePeer(peer))
    },

    error(peer) {
        realtime.remove(asRealtimePeer(peer))
    },
})
