import { deleteNote } from "../../services/notes"

export default defineEventHandler(async (event) => {
    const actor = requireUser(event)
    assertPermission(actor, "notes", "delete")
    await deleteNote({ event, actor }, readIdParam(event, "notes.not_found"))
    return { ok: true }
})
