export default defineEventHandler(async (event) => {
    assertPermission(requireUser(event), "settings", "manage")
    return getAllSettings()
})
