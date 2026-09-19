export default defineEventHandler(async (event) => {
    const sid = event.context.auth?.sid
    if (sid) await revokeSession(sid)
    await clearUserSession(event)
    return { ok: true }
})
