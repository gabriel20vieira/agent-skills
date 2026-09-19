import { z } from "zod"
import { ROLES } from "../utils/permissions"

export const emailSchema = z.string().trim().toLowerCase().pipe(z.email().max(191))
export const nameSchema = z.string().trim().min(1).max(120)
export const rolesSchema = z.array(z.enum(ROLES)).min(1)
export const localeSchema = z.enum(["pt-PT", "en-US"])
