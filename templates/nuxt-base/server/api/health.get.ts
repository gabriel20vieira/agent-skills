import { sql } from "drizzle-orm"

export default defineEventHandler(async (event) => {
    const { public: { appVersion } } = useRuntimeConfig(event)
    let db: "ok" | "down" = "ok"
    try {
        await useDb().execute(sql`SELECT 1`)
    }
    catch {
        db = "down"
    }
    if (db === "down") setResponseStatus(event, 503)
    return { status: db === "ok" ? "ok" : "degraded", version: appVersion, db }
})
