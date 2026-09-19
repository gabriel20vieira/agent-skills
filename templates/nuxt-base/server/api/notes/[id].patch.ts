import { updateNote } from "../../services/notes"
import { noteUpdateSchema } from "#shared/schemas/notes"

export default defineEventHandler(async (event) => {
    const actor = requireUser(event)
    assertPermission(actor, "notes", "update")
    const id = readIdParam(event, "notes.not_found")
    const body = await readBodyWith(event, noteUpdateSchema)
    return updateNote({ event, actor }, id, body)
})
