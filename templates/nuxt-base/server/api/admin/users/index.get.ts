import { listUsers } from "../../../services/users"

export default defineEventHandler(async (event) => {
    assertPermission(requireUser(event), "users", "read")
    return listUsers()
})
