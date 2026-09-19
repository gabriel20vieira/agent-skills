import { z } from "zod"
import { emailSchema, nameSchema, rolesSchema } from "./common"
import { passwordSchema } from "./password"

export const userCreateSchema = z.object({
    email: emailSchema,
    name: nameSchema,
    roles: rolesSchema,
    /** Omit to generate one, shown once, with a forced change at first login. */
    password: passwordSchema.optional(),
})

export const userUpdateSchema = z.object({
    name: nameSchema.optional(),
    roles: rolesSchema.optional(),
    active: z.boolean().optional(),
})
