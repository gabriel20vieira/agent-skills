import { getNote } from "../../services/notes"

export default defineEventHandler(async (event) => {
    assertPermission(requireUser(event), "notes", "read")
    return getNote(readIdParam(event, "notes.not_found"))
})
