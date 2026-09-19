import { z } from "zod"

export const MIN_PASSWORD_LENGTH = 12

export const passwordSchema = z.string().min(MIN_PASSWORD_LENGTH).max(255)
