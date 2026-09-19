import { eq } from "drizzle-orm"
import { users } from "../db/schema"
import { createRealtimeHub } from "./realtimeHub"

/**
 * The process-wide hub. Services publish after their transaction commits:
 * `realtime.publish(resourceTopic("notes"), "notes.created", { id })`.
 * Kept on globalThis so dev hot reloads reuse one hub instead of stranding sockets.
 */
const globalKey = "__nuxtBaseRealtime" as const
type GlobalWithHub = typeof globalThis & { [globalKey]?: ReturnType<typeof createRealtimeHub> }

export const realtime = (globalThis as GlobalWithHub)[globalKey] ??= createRealtimeHub()

/** Re-reads a user's roles/status and pushes the change to their open sockets. */
export async function syncUserRealtime(userId: number) {
    const [row] = await useDb().select().from(users).where(eq(users.id, userId)).limit(1)
    realtime.refreshUser(userId, row?.active ? toAuthUser(toSessionUser(row)) : null)
    realtime.publishToUser(userId, "user.updated", { id: userId })
}
