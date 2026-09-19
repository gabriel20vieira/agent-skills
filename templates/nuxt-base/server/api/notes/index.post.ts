import { createNote } from "../../services/notes"
import { noteCreateSchema } from "#shared/schemas/notes"

export default defineEventHandler(async (event) => {
    const actor = requireUser(event)
    assertPermission(actor, "notes", "create")
    const body = await readBodyWith(event, noteCreateSchema)
    setResponseStatus(event, 201)
    return createNote({ event, actor }, body)
})
