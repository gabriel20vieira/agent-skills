import { z } from "zod"
import { defineAssistantTool, pickFields } from "../defineTool"

// Reference tools over the notes example resource. Copy them for your own resources
// (see the web-assistant-tool skill) and delete these when notes goes away.

interface NoteRow extends Record<string, unknown> {
    id: number
    title: string
    body: string
    authorName: string | null
    updatedAt: string
}

export const listNotes = defineAssistantTool({
    kind: "read",
    name: "list_notes",
    description: "List the notes the user can see (id, title, updated date). Use it before answering questions about notes.",
    parameters: z.object({
        search: z.string().max(100).optional().describe("Only notes whose title contains this text"),
    }),
    permission: ["notes", "read"],
    async run(ctx, args) {
        const rows = await ctx.api<NoteRow[]>("/api/notes")
        const wanted = args.search?.toLowerCase()
        const matching = wanted ? rows.filter(row => row.title.toLowerCase().includes(wanted)) : rows
        // authorName is personal data the model does not need: left out on purpose.
        return pickFields(matching.slice(0, 50), ["id", "title", "updatedAt"] as const)
    },
})

export const chartNotesByMonth = defineAssistantTool({
    kind: "chart",
    name: "chart_notes_by_month",
    description: "Show a chart of how many notes were last updated in each of the recent months. Use it when the user asks for a chart or trend of notes.",
    parameters: z.object({
        months: z.number().int().min(1).max(24).default(6).describe("How many months back, including the current one"),
        type: z.enum(["column", "line", "area", "table"]).default("column"),
    }),
    permission: ["notes", "read"],
    async run(ctx, args) {
        const rows = await ctx.api<NoteRow[]>("/api/notes")
        const now = new Date()
        const keys = Array.from({ length: args.months }, (_, index) => {
            const month = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (args.months - 1 - index), 1))
            return month.toISOString().slice(0, 7)
        })
        const counts = new Map(keys.map(key => [key, 0]))
        for (const row of rows) {
            const key = String(row.updatedAt).slice(0, 7)
            if (counts.has(key)) counts.set(key, counts.get(key)! + 1)
        }
        return { type: args.type, title: "Notes per month", categories: keys, series: [{ name: "Notes", data: keys.map(key => counts.get(key)!) }] }
    },
})

export const proposeNote = defineAssistantTool({
    kind: "propose",
    name: "propose_note",
    description: "Propose creating a note. The user sees a card and decides; nothing is saved until they accept.",
    parameters: z.object({
        title: z.string().min(1).max(200),
        body: z.string().max(5000).default(""),
    }),
    permission: ["notes", "create"],
    async propose(_ctx, args) {
        return {
            summary: `Create note "${args.title}"`,
            request: { method: "POST", url: "/api/notes", body: { title: args.title, body: args.body } },
        }
    },
    async verify(ctx, args, resultId) {
        if (resultId === undefined) return false
        const note = await ctx.api<NoteRow>(`/api/notes/${resultId}`).catch(() => null)
        return note?.title === args.title
    },
})
