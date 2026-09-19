import { count, desc, eq } from "drizzle-orm"
import { z } from "zod"
import { auditLog, users } from "../../db/schema"

const querySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    size: z.coerce.number().int().min(1).max(100).default(25),
    action: z.string().max(64).optional(),
})

export default defineEventHandler(async (event) => {
    assertPermission(requireUser(event), "audit", "read")
    const query = readQueryWith(event, querySchema)
    const where = query.action ? eq(auditLog.action, query.action) : undefined
    const db = useDb()
    const [items, [total]] = await Promise.all([
        db.select({
            id: auditLog.id,
            action: auditLog.action,
            resource: auditLog.resource,
            resourceId: auditLog.resourceId,
            meta: auditLog.meta,
            ip: auditLog.ip,
            createdAt: auditLog.createdAt,
            userId: auditLog.userId,
            userName: users.name,
        })
            .from(auditLog)
            .leftJoin(users, eq(users.id, auditLog.userId))
            .where(where)
            .orderBy(desc(auditLog.id))
            .limit(query.size)
            .offset((query.page - 1) * query.size),
        db.select({ value: count() }).from(auditLog).where(where),
    ])
    return { items, total: total?.value ?? 0, page: query.page, size: query.size }
})
