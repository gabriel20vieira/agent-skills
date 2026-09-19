import { afterAll, describe, expect, it } from "vitest"
import { TEST_ENV } from "./database"
import { createClient, setBaseUrl, url } from "./helpers"
import type { Client } from "./helpers"
import { startApp } from "./server"

const app = await startApp("assistant")
setBaseUrl(app.baseUrl)
afterAll(() => app.stop())

/** POSTs to the chat endpoint and collects every streamed event. */
async function chat(client: Client, body: Record<string, unknown>) {
    const cookie = [...client.jar].map(([name, value]) => `${name}=${value}`).join("; ")
    const response = await fetch(url("/api/assistant/chat"), {
        method: "POST",
        headers: { "content-type": "application/json", cookie },
        body: JSON.stringify(body),
    })
    const text = await response.text()
    const events = response.headers.get("content-type")?.includes("text/event-stream")
        ? text.split("\n\n").map(block => block.split("\n").find(line => line.startsWith("data:"))?.slice(5).trim()).filter(Boolean).map(data => JSON.parse(data!))
        : []
    return { status: response.status, events, text }
}

describe("assistant", () => {
    const admin = createClient()
    const editor = createClient()
    const reader = createClient()
    let conversationId = 0
    let proposalId = 0

    it("sets up users; the assistant is off by default", async () => {
        await admin.post("/api/auth/setup", { code: TEST_ENV.NUXT_SETUP_CODE, name: "Admin", email: "admin@example.test", password: "admin-password-123" })
        await admin.post("/api/admin/users", { email: "editor@example.test", name: "Editor", roles: ["editor"], password: "editor-password-123" })
        await admin.post("/api/admin/users", { email: "reader@example.test", name: "Reader", roles: ["user"], password: "reader-password-123" })
        await editor.post("/api/auth/login", { email: "editor@example.test", password: "editor-password-123" })
        await reader.post("/api/auth/login", { email: "reader@example.test", password: "reader-password-123" })
        const off = await chat(editor, { message: "hello" })
        expect(off.status).toBe(503)
        expect(off.text).toContain("assistant.disabled")
    })

    it("streams a reply once enabled (fake provider)", async () => {
        expect((await admin.put("/api/admin/settings/assistant.provider", { value: "fake" })).status).toBe(200)
        expect((await admin.put("/api/admin/settings/assistant.enabled", { value: true })).status).toBe(200)
        const result = await chat(editor, { message: "hello" })
        expect(result.status).toBe(200)
        expect(result.events[0]).toMatchObject({ type: "conversation" })
        conversationId = result.events[0].id
        const text = result.events.filter((event: any) => event.type === "text").map((event: any) => event.text).join("")
        expect(text).toBe("You said: hello (tools: list_notes, propose_note)")
        expect(result.events.at(-1)).toEqual({ type: "done" })
    })

    it("offers only the tools the user's roles allow, and refuses the rest", async () => {
        const result = await chat(reader, { message: "propose note: Sneaky" })
        expect(result.events.some((event: any) => event.type === "proposal")).toBe(false)
        const text = result.events.filter((event: any) => event.type === "text").map((event: any) => event.text).join("")
        expect(text).toContain("tool_not_available")
    })

    it("reads through the REST API with an allow-list of fields", async () => {
        await editor.post("/api/notes", { title: "Existing", body: "secret body" })
        const result = await chat(editor, { conversationId, message: "list notes" })
        expect(result.events).toContainEqual({ type: "tool", name: "list_notes" })
        const text = result.events.filter((event: any) => event.type === "text").map((event: any) => event.text).join("")
        expect(text).toContain("Existing")
        expect(text).not.toContain("secret body")
        expect(text).not.toContain("authorName")
    })

    it("turns a write into a proposal the user settles through REST", async () => {
        const result = await chat(editor, { conversationId, message: "propose note: From the assistant" })
        const proposal = result.events.find((event: any) => event.type === "proposal")?.proposal
        expect(proposal).toMatchObject({ state: "pending", request: { method: "POST", url: "/api/notes" } })
        proposalId = proposal.id
        // Nothing written yet.
        expect((await editor.get("/api/notes")).data.map((note: any) => note.title)).not.toContain("From the assistant")

        expect((await reader.post(`/api/assistant/proposals/${proposalId}/claim`)).code).toBe("assistant.proposal_not_found")
        const claimed = await editor.post(`/api/assistant/proposals/${proposalId}/claim`)
        expect(claimed.data.state).toBe("claimed")
        expect((await editor.post(`/api/assistant/proposals/${proposalId}/claim`)).code).toBe("assistant.proposal_handled")

        const created = await editor.post(claimed.data.request.url, claimed.data.request.body)
        expect(created.status).toBe(201)
        const view = (await editor.post(`/api/assistant/proposals/${proposalId}/settle`, { ok: true, resultId: created.data.id })).data
        expect(view).toEqual({ state: "done" })
        expect((await editor.post(`/api/assistant/proposals/${proposalId}/settle`, { ok: true })).code).toBe("assistant.proposal_handled")
    })

    it("marks a settle that the database does not confirm as failed", async () => {
        const result = await chat(editor, { conversationId, message: "propose note: Never saved" })
        const id = result.events.find((event: any) => event.type === "proposal").proposal.id
        await editor.post(`/api/assistant/proposals/${id}/claim`)
        expect((await editor.post(`/api/assistant/proposals/${id}/settle`, { ok: true, resultId: 999999 })).data).toEqual({ state: "failed" })
    })

    it("keeps conversations private and lists them for the owner", async () => {
        expect((await editor.get("/api/assistant/conversations")).data.map((item: any) => item.id)).toContain(conversationId)
        expect((await reader.get(`/api/assistant/conversations/${conversationId}`)).code).toBe("assistant.not_found")
        const view = (await editor.get(`/api/assistant/conversations/${conversationId}`)).data
        expect(view.proposals.map((item: any) => item.state)).toEqual(["done", "failed"])
        expect(view.messages.every((message: any) => message.role !== "system")).toBe(true)
        expect((await editor.delete(`/api/assistant/conversations/${conversationId}`)).status).toBe(200)
        expect((await editor.get(`/api/assistant/conversations/${conversationId}`)).code).toBe("assistant.not_found")
    })
})
