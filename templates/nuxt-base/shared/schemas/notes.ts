import { z } from "zod"

export const noteCreateSchema = z.object({
    title: z.string().trim().min(1).max(200),
    body: z.string().max(20_000).default(""),
})

export const noteUpdateSchema = noteCreateSchema.partial()

export type NoteCreate = z.infer<typeof noteCreateSchema>
export type NoteUpdate = z.infer<typeof noteUpdateSchema>
