import { z } from "zod"
import { localeSchema, nameSchema } from "./common"
import { passwordSchema } from "./password"

export const profileSchema = z.object({
    name: nameSchema.optional(),
    locale: localeSchema.nullable().optional(),
    theme: z.string().max(32).nullable().optional(),
})

export const changePasswordSchema = z.object({
    current: z.string().min(1).max(255),
    next: passwordSchema,
})
