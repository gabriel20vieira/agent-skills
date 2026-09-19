import { afterAll, describe, expect, it } from "vitest"
import { TEST_ENV } from "./database"
import { createClient, setBaseUrl } from "./helpers"
import { startApp } from "./server"
import { isEvent, openSocket } from "./socket"
import type { TestSocket } from "./socket"

const app = await startApp("realtime")
setBaseUrl(app.baseUrl)
afterAll(() => app.stop())

describe("realtime", () => {
    const admin = createClient()
    const member = createClient()
    const sockets: TestSocket[] = []
    let adminSocket: TestSocket
    let memberSocket: TestSocket
    let memberId = 0

    afterAll(() => sockets.forEach(socket => socket.close()))

    it("refuses anonymous connections", async () => {
        await expect(openSocket(createClient())).rejects.toThrow("HTTP 401")
    })

    it("greets signed-in users with ready", async () => {
        await admin.post("/api/auth/setup", { code: TEST_ENV.NUXT_SETUP_CODE, name: "Admin", email: "admin@example.test", password: "admin-password-123" })
        const created = await admin.post("/api/admin/users", { email: "member@example.test", name: "Member", roles: ["user"], password: "member-password-123" })
        memberId = created.data.user.id
        await member.post("/api/auth/login", { email: "member@example.test", password: "member-password-123" })

        adminSocket = await openSocket(admin)
        memberSocket = await openSocket(member)
        sockets.push(adminSocket, memberSocket)
        await adminSocket.next(message => message.type === "ready")
        await memberSocket.next(message => message.type === "ready")
        expect((await admin.get("/api/health")).data.realtime.peers).toBe(2)
    })

    it("authorises topics with the permission matrix", async () => {
        memberSocket.send({ type: "subscribe", topic: "res:users" })
        expect(await memberSocket.next(message => message.type === "error"))
            .toEqual({ type: "error", code: "auth.forbidden", topic: "res:users" })
        adminSocket.send({ type: "subscribe", topic: "res:users" })
        await adminSocket.next(message => message.type === "subscribed" && message.topic === "res:users")
    })

    it("pushes changes to the affected user and to resource followers", async () => {
        await admin.patch(`/api/admin/users/${memberId}`, { name: "Renamed" })
        expect((await memberSocket.next(isEvent("user.updated"))).data).toEqual({ id: memberId })
        const updated = await adminSocket.next(isEvent("users.updated"))
        expect(updated).toMatchObject({ topic: "res:users", data: { id: memberId } })
        expect(memberSocket.messages.some(isEvent("users.updated"))).toBe(false)
    })

    it("broadcasts maintenance to everyone", async () => {
        await admin.put("/api/admin/settings/maintenance.enabled", { value: true })
        expect((await memberSocket.next(isEvent("system.maintenance"))).data).toEqual({ enabled: true })
        await adminSocket.next(isEvent("system.maintenance"))
        await admin.put("/api/admin/settings/maintenance.enabled", { value: false })
    })

    it("tells a revoked session and closes its socket", async () => {
        await admin.post(`/api/admin/users/${memberId}/reset-password`)
        await memberSocket.next(isEvent("session.revoked"))
        expect(await memberSocket.closed).toBe(4401)
        await expect(openSocket(member)).rejects.toThrow("HTTP 401")
    })
})
