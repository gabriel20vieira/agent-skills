import { describeInvite } from "../../services/invites"

export default defineEventHandler(async (event) => {
    return describeInvite(getRouterParam(event, "token") ?? "")
})
