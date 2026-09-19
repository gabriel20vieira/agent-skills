import { afterAll, describe, expect, it } from "vitest"
import { TEST_ENV } from "./database"
import { createClient, setBaseUrl } from "./helpers"
import { startApp } from "./server"
import { isEvent, openSocket } from "./socket"

const app = await startApp("tenancy")
setBaseUrl(app.baseUrl)
afterAll(() => app.stop())

describe("tenancy", () => {
    const admin = createClient()
    const alice = createClient()
    const bob = createClient()
    const eve = createClient()
    let orgId = 0
    let bobId = 0

    it("sets up three users", async () => {
        await admin.post("/api/auth/setup", { code: TEST_ENV.NUXT_SETUP_CODE, name: "Admin", email: "admin@example.test", password: "admin-password-123" })
        for (const [client, name] of [[alice, "alice"], [bob, "bob"], [eve, "eve"]] as const) {
            const created = await admin.post("/api/admin/users", { email: `${name}@example.test`, name, roles: ["user"], password: `${name}-password-123` })
            if (name === "bob") bobId = created.data.user.id
            expect((await client.post("/api/auth/login", { email: `${name}@example.test`, password: `${name}-password-123` })).status).toBe(200)
        }
    })

    it("creates an organisation with the creator as owner and makes it active", async () => {
        const created = await alice.post("/api/orgs", { name: "Acme" })
        expect(created.status).toBe(201)
        orgId = created.data.id
        const mine = await alice.get("/api/orgs")
        expect(mine.data).toEqual({ organizations: [{ id: orgId, name: "Acme", role: "owner" }], activeId: orgId })
    })

    it("hides organisations from non-members (404, not 403)", async () => {
        expect((await eve.get(`/api/orgs/${orgId}/members`)).code).toBe("orgs.not_found")
        expect((await eve.put("/api/orgs/active", { orgId })).code).toBe("orgs.not_found")
        expect((await eve.get("/api/orgs")).data).toEqual({ organizations: [], activeId: null })
    })

    it("adds a member, who is told over realtime", async () => {
        const socket = await openSocket(bob)
        await socket.next(message => message.type === "ready")
        expect((await alice.post(`/api/orgs/${orgId}/members`, { email: "nobody@example.test" })).code).toBe("orgs.user_not_found")
        expect((await alice.post(`/api/orgs/${orgId}/members`, { email: "bob@example.test", role: "member" })).status).toBe(201)
        expect((await socket.next(isEvent("organizations.changed"))).data).toEqual({ orgId })
        socket.close()
        expect((await alice.post(`/api/orgs/${orgId}/members`, { email: "bob@example.test" })).code).toBe("orgs.already_member")
        expect((await bob.get(`/api/orgs/${orgId}/members`)).data.map((member: any) => member.role).sort()).toEqual(["member", "owner"])
    })

    it("enforces organisation roles", async () => {
        expect((await bob.post(`/api/orgs/${orgId}/members`, { email: "eve@example.test" })).code).toBe("auth.forbidden")
        expect((await bob.patch(`/api/orgs/${orgId}`, { name: "Hacked" })).code).toBe("auth.forbidden")
        expect((await bob.delete(`/api/orgs/${orgId}`)).code).toBe("auth.forbidden")
        // Only owners make owners.
        expect((await alice.patch(`/api/orgs/${orgId}/members/${bobId}`, { role: "admin" })).status).toBe(200)
        expect((await bob.post(`/api/orgs/${orgId}/members`, { email: "eve@example.test", role: "owner" })).code).toBe("auth.forbidden")
        expect((await bob.post(`/api/orgs/${orgId}/members`, { email: "eve@example.test", role: "member" })).status).toBe(201)
    })

    it("keeps at least one owner", async () => {
        const aliceId = (await alice.get("/api/auth/me")).data.id
        expect((await alice.delete(`/api/orgs/${orgId}/members/${aliceId}`)).code).toBe("orgs.last_owner")
        expect((await alice.patch(`/api/orgs/${orgId}/members/${aliceId}`, { role: "member" })).code).toBe("orgs.last_owner")
    })

    it("lets a member leave and the owner delete the organisation", async () => {
        expect((await bob.delete(`/api/orgs/${orgId}/members/${bobId}`)).status).toBe(200)
        expect((await bob.get(`/api/orgs/${orgId}/members`)).code).toBe("orgs.not_found")
        expect((await alice.delete(`/api/orgs/${orgId}`)).status).toBe(200)
        expect((await alice.get("/api/orgs")).data.organizations).toEqual([])
    })
})
