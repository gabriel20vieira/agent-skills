import { z } from "zod"

export const assistantChatSchema = z.object({
    conversationId: z.number().int().positive().optional(),
    message: z.string().trim().min(1).max(4000),
})

export const proposalSettleSchema = z.object({
    ok: z.boolean(),
    /** Id of the record the REST call created or changed, when there is one. */
    resultId: z.union([z.number().int().positive(), z.string().max(64)]).optional(),
    error: z.string().max(200).optional(),
})
