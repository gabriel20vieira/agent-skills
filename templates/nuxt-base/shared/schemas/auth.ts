import { z } from "zod"
import { emailSchema, nameSchema, rolesSchema } from "./common"
import { passwordSchema } from "./password"

export const loginSchema = z.object({
    email: emailSchema,
    password: z.string().min(1).max(255),
    remember: z.boolean().default(false),
})

export const setupSchema = z.object({
    code: z.string().trim().min(1).max(255),
    name: nameSchema,
    email: emailSchema,
    password: passwordSchema,
})

export const mimicSchema = z.object({ roles: rolesSchema })
