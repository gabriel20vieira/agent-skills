import { createInvite } from "../../../services/invites"
import { inviteCreateSchema } from "../../../../shared/schemas/invites"

/** Returns the token once; the client turns it into /convite/<token>. */
export default defineEventHandler(async (event) => {
    const actor = requireUser(event)
    assertPermission(actor, "users", "create")
    const body = await readBodyWith(event, inviteCreateSchema)
    setResponseStatus(event, 201)
    return createInvite({ event, actor }, body)
})
