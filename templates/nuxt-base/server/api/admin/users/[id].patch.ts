import { updateUser } from "../../../services/users"
import { userUpdateSchema } from "../../../../shared/schemas/users"

export default defineEventHandler(async (event) => {
    const actor = requireUser(event)
    assertPermission(actor, "users", "update")
    const id = readIdParam(event, "users.not_found")
    const body = await readBodyWith(event, userUpdateSchema)
    return updateUser({ event, actor }, id, body)
})
