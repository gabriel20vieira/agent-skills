import type { H3Event } from "h3"
import { auditLog } from "../db/schema"

export interface AuditEntry {
    action: string
    resource: string
    resourceId?: string | number | null
    meta?: Record<string, unknown>
    /** Defaults to the signed-in user; set it when the actor has only just been created. */
    userId?: number | null
}

/** Records who did what. Call it after the change succeeded. */
export async function audit(event: H3Event, entry: AuditEntry) {
    await useDb().insert(auditLog).values({
        userId: entry.userId ?? event.context.auth?.user.id ?? null,
        action: entry.action,
        resource: entry.resource,
        resourceId: entry.resourceId == null ? null : String(entry.resourceId),
        meta: entry.meta ?? null,
        ip: resolveClientIp(event).slice(0, 64),
    })
}
