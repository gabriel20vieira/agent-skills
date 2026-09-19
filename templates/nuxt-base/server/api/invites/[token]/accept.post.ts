import { acceptInvite } from "../../../services/invites"
import { inviteAcceptSchema } from "#shared/schemas/invites"

export default defineEventHandler(async (event) => {
    await enforceCredentialLimit(event, "invite")
    const body = await readBodyWith(event, inviteAcceptSchema)
    await acceptInvite(event, getRouterParam(event, "token") ?? "", body)
    return { ok: true }
})
