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
