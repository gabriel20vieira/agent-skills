import { z } from "zod"
import { emailSchema, nameSchema, rolesSchema } from "./common"
import { passwordSchema } from "./password"

export const inviteCreateSchema = z.object({
    email: emailSchema.optional(),
    roles: rolesSchema,
    expiresInHours: z.number().int().min(1).max(24 * 30).default(72),
})

export const inviteAcceptSchema = z.object({
    name: nameSchema,
    email: emailSchema,
    password: passwordSchema,
})
