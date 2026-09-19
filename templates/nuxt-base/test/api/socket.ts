import WebSocket from "ws"
import { url } from "./helpers"
import type { Client } from "./helpers"

export interface TestSocket {
    messages: any[]
    send(message: object): void
    /** Resolves with the first message (already received or future) matching predicate. */
    next(predicate: (message: any) => boolean, timeoutMs?: number): Promise<any>
    closed: Promise<number>
    close(): void
}

/** Opens /_ws with the client's cookies. Rejects with the HTTP status if the upgrade is refused. */
export function openSocket(client: Client): Promise<TestSocket> {
    const target = url("/_ws").replace(/^http/, "ws")
    const cookie = [...client.jar].map(([name, value]) => `${name}=${value}`).join("; ")
    const ws = new WebSocket(target, { headers: { cookie } })
    const messages: any[] = []
    const waiters: { predicate: (message: any) => boolean, resolve: (message: any) => void }[] = []

    ws.on("message", (raw) => {
        const message = JSON.parse(raw.toString())
        messages.push(message)
        for (const waiter of [...waiters]) {
            if (waiter.predicate(message)) {
                waiters.splice(waiters.indexOf(waiter), 1)
                waiter.resolve(message)
            }
        }
    })
    const closed = new Promise<number>(resolve => ws.on("close", code => resolve(code)))

    const socket: TestSocket = {
        messages,
        send: message => ws.send(JSON.stringify(message)),
        next(predicate, timeoutMs = 5000) {
            const found = messages.find(predicate)
            if (found) return Promise.resolve(found)
            return new Promise((resolve, reject) => {
                const timer = setTimeout(() => reject(new Error(`timeout; got ${JSON.stringify(messages)}`)), timeoutMs)
                waiters.push({ predicate, resolve: (message) => {
                    clearTimeout(timer)
                    resolve(message)
                } })
            })
        },
        closed,
        close: () => ws.close(),
    }

    return new Promise((resolve, reject) => {
        ws.on("open", () => resolve(socket))
        ws.on("unexpected-response", (_request, response) => reject(new Error(`HTTP ${response.statusCode}`)))
        ws.on("error", reject)
    })
}

export const isEvent = (name: string) => (message: any) => message.type === "event" && message.event === name
