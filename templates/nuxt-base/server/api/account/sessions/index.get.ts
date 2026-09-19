import { and, desc, eq, gt, isNull } from "drizzle-orm"
import { sessions } from "../../../db/schema"

export default defineEventHandler(async (event) => {
    const user = requireUser(event)
    const sid = event.context.auth!.sid
    const rows = await useDb()
        .select({
            id: sessions.id,
            ip: sessions.ip,
            userAgent: sessions.userAgent,
            createdAt: sessions.createdAt,
            lastSeenAt: sessions.lastSeenAt,
        })
        .from(sessions)
        .where(and(eq(sessions.userId, user.id), isNull(sessions.revokedAt), gt(sessions.expiresAt, new Date())))
        .orderBy(desc(sessions.lastSeenAt))
    return rows.map(row => ({ ...row, current: row.id === sid }))
})
