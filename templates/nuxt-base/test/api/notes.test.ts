import { afterAll, describe, expect, it } from "vitest"
import { TEST_ENV } from "./database"
import { createClient, setBaseUrl } from "./helpers"
import { startApp } from "./server"
import { isEvent, openSocket } from "./socket"

const app = await startApp("notes")
setBaseUrl(app.baseUrl)
afterAll(() => app.stop())

// The reference resource: every new resource should get the same coverage.
describe("notes", () => {
    const admin = createClient()
    const editor = createClient()
    const reader = createClient()
    let noteId = 0

    it("sets up an editor and a reader", async () => {
        await admin.post("/api/auth/setup", { code: TEST_ENV.NUXT_SETUP_CODE, name: "Admin", email: "admin@example.test", password: "admin-password-123" })
        await admin.post("/api/admin/users", { email: "editor@example.test", name: "Editor", roles: ["editor"], password: "editor-password-123" })
        await admin.post("/api/admin/users", { email: "reader@example.test", name: "Reader", roles: ["user"], password: "reader-password-123" })
        expect((await editor.post("/api/auth/login", { email: "editor@example.test", password: "editor-password-123" })).status).toBe(200)
        expect((await reader.post("/api/auth/login", { email: "reader@example.test", password: "reader-password-123" })).status).toBe(200)
    })

    it("lets an editor create, and validates input", async () => {
        expect((await editor.post("/api/notes", { title: "", body: "x" })).code).toBe("validation.invalid")
        const created = await editor.post("/api/notes", { title: "First", body: "Hello" })
        expect(created.status).toBe(201)
        expect(created.data).toMatchObject({ title: "First", body: "Hello", authorName: "Editor" })
        noteId = created.data.id
    })

    it("lets a reader list and read but not write", async () => {
        expect((await reader.get("/api/notes")).data.map((note: any) => note.id)).toEqual([noteId])
        expect((await reader.get(`/api/notes/${noteId}`)).data.title).toBe("First")
        expect((await reader.post("/api/notes", { title: "No", body: "" })).code).toBe("auth.forbidden")
        expect((await reader.patch(`/api/notes/${noteId}`, { title: "No" })).code).toBe("auth.forbidden")
        expect((await reader.delete(`/api/notes/${noteId}`)).code).toBe("auth.forbidden")
    })

    it("updates, 404s on missing ids and deletes", async () => {
        expect((await editor.patch(`/api/notes/${noteId}`, { title: "Renamed" })).data.title).toBe("Renamed")
        expect((await editor.get("/api/notes/999999")).code).toBe("notes.not_found")
        expect((await editor.get("/api/notes/abc")).code).toBe("notes.not_found")
    })

    it("pushes notes events to followers of res:notes", async () => {
        const socket = await openSocket(reader)
        await socket.next(message => message.type === "ready")
        socket.send({ type: "subscribe", topic: "res:notes" })
        await socket.next(message => message.type === "subscribed")

        const created = await editor.post("/api/notes", { title: "Live", body: "" })
        expect((await socket.next(isEvent("notes.created"))).data).toEqual({ id: created.data.id })
        await editor.patch(`/api/notes/${created.data.id}`, { body: "changed" })
        await socket.next(isEvent("notes.updated"))
        expect((await editor.delete(`/api/notes/${created.data.id}`)).status).toBe(200)
        expect((await socket.next(isEvent("notes.deleted"))).data).toEqual({ id: created.data.id })
        socket.close()
    })

    it("records writes in the audit log", async () => {
        const audit = await admin.get("/api/admin/audit?action=notes.create")
        expect(audit.data.total).toBe(2)
    })
})
