import { createUser } from "../../../services/users"
import { userCreateSchema } from "#shared/schemas/users"

export default defineEventHandler(async (event) => {
    const actor = requireUser(event)
    assertPermission(actor, "users", "create")
    const body = await readBodyWith(event, userCreateSchema)
    setResponseStatus(event, 201)
    return createUser({ event, actor }, body)
})
