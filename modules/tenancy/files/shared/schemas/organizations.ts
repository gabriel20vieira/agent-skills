import { z } from "zod"
import { ORG_ROLES } from "../utils/tenancy"
import { emailSchema } from "./common"

export const orgCreateSchema = z.object({
    name: z.string().trim().min(2).max(120),
})
export const orgUpdateSchema = orgCreateSchema

export const memberAddSchema = z.object({
    email: emailSchema,
    role: z.enum(ORG_ROLES).default("member"),
})

export const memberUpdateSchema = z.object({
    role: z.enum(ORG_ROLES),
})

export const activeOrgSchema = z.object({
    orgId: z.number().int().positive(),
})

export type OrgCreate = z.infer<typeof orgCreateSchema>
export type MemberAdd = z.infer<typeof memberAddSchema>
