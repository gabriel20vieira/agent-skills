import { z } from "zod"

const bodySchema = z.object({ value: z.unknown() })

export default defineEventHandler(async (event) => {
    assertPermission(requireUser(event), "settings", "manage")
    const key = getRouterParam(event, "key") ?? ""
    if (!isSettingKey(key)) throw fail(404, "settings.unknown")
    const body = await readBodyWith(event, bodySchema)
    const value = await setSetting(key, body.value)
    await audit(event, { action: "settings.update", resource: "settings", resourceId: key, meta: { value } })
    return { key, value }
})
