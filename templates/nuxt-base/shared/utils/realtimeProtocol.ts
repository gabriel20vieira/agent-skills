import { z } from "zod"
import type { AuthUser } from "../types/auth"
import { can, RESOURCES } from "./permissions"
import type { Resource } from "./permissions"

const topicSchema = z.string().min(1).max(128)

const clientMessageSchema = z.discriminatedUnion("type", [
    z.object({ type: z.literal("subscribe"), topic: topicSchema }),
    z.object({ type: z.literal("unsubscribe"), topic: topicSchema }),
    z.object({ type: z.literal("ping") }),
])

export type ClientMessage = z.infer<typeof clientMessageSchema>

export type ServerMessage
    = | { type: "ready" }
        | { type: "pong" }
        | { type: "subscribed" | "unsubscribed", topic: string }
        | { type: "event", topic: string, event: string, data: unknown, ts: number }
        | { type: "error", code: string, topic?: string }

export function parseClientMessage(raw: string): ClientMessage | null {
    try {
        const result = clientMessageSchema.safeParse(JSON.parse(raw))
        return result.success ? result.data : null
    }
    catch {
        return null
    }
}

export const SYSTEM_TOPIC = "system"

export function userTopic(id: number) {
    return `user:${id}`
}

export function resourceTopic(resource: Resource, id?: number | string) {
    return id === undefined ? `res:${resource}` : `res:${resource}:${id}`
}

/**
 * Who may follow a topic. Events carry ids only, so reading the topic can never reveal
 * more than the REST read permission already does.
 */
export function authorizeTopic(user: AuthUser, topic: string): boolean {
    if (topic === SYSTEM_TOPIC) return true
    if (topic.startsWith("user:")) return topic === userTopic(user.id)
    const match = /^res:([a-z_]+)(?::[\w-]+)?$/.exec(topic)
    if (!match) return false
    const resource = match[1] as Resource
    return (RESOURCES as readonly string[]).includes(resource) && can(user.effectiveRoles, resource, "read")
}
