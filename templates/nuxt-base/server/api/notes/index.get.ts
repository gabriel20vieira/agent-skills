import { listNotes } from "../../services/notes"

export default defineEventHandler(async (event) => {
    assertPermission(requireUser(event), "notes", "read")
    return listNotes()
})
