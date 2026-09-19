import { afterAll, describe, expect, it } from "vitest"
import { TEST_ENV } from "./database"
import { createClient, setBaseUrl } from "./helpers"
import { startApp } from "./server"

const SETUP_CODE = TEST_ENV.NUXT_SETUP_CODE
const ADMIN = { name: "Admin", email: "admin@example.test", password: "admin-password-123" }

const app = await startApp("auth")
setBaseUrl(app.baseUrl)
afterAll(() => app.stop())

// The cases build on each other (setup -> users -> sessions), so they run in order.
describe("auth, users and settings", () => {
    const admin = createClient()
    const member = createClient()
    const memberSecondDevice = createClient()
    let memberId = 0
    let memberPassword = ""

    it("reports that setup is needed", async () => {
        const response = await admin.get("/api/auth/status")
        expect(response.data).toEqual({ needsSetup: true, setupEnabled: true })
    })

    it("rejects a wrong setup code, accepts the right one", async () => {
        expect((await admin.post("/api/auth/setup", { ...ADMIN, code: "WRONG" })).code).toBe("auth.setup_code_invalid")
        expect((await admin.post("/api/auth/setup", { ...ADMIN, code: SETUP_CODE })).status).toBe(200)
    })

    it("refuses a second setup", async () => {
        const response = await createClient().post("/api/auth/setup", { ...ADMIN, email: "x@example.test", code: SETUP_CODE })
        expect(response.status).toBe(409)
        expect(response.code).toBe("auth.setup_done")
    })

    it("returns the signed-in admin", async () => {
        const response = await admin.get("/api/auth/me")
        expect(response.data).toMatchObject({ email: ADMIN.email, roles: ["admin"], effectiveRoles: ["admin"] })
    })

    it("answers wrong password and unknown email identically", async () => {
        const wrong = await createClient().post("/api/auth/login", { email: ADMIN.email, password: "nope" })
        const unknown = await createClient().post("/api/auth/login", { email: "ghost@example.test", password: "nope" })
        expect([wrong.status, wrong.code]).toEqual([401, "auth.invalid_credentials"])
        expect([unknown.status, unknown.code]).toEqual([401, "auth.invalid_credentials"])
    })

    it("validates input with the standard envelope", async () => {
        const response = await admin.post("/api/admin/users", { email: "not-an-email", name: "", roles: [] })
        expect(response.status).toBe(400)
        expect(response.code).toBe("validation.invalid")
        expect(response.data.data.issues.length).toBeGreaterThan(0)
    })

    it("creates a user with a generated password that must be changed", async () => {
        const response = await admin.post("/api/admin/users", { email: "member@example.test", name: "Member", roles: ["user"] })
        expect(response.status).toBe(201)
        expect(response.data.user.mustChangePassword).toBe(true)
        expect(response.data.generatedPassword).toMatch(/^\S{4}-\S{4}-\S{4}-\S{4}$/)
        memberId = response.data.user.id
        memberPassword = response.data.generatedPassword
        expect((await admin.post("/api/admin/users", { email: "member@example.test", name: "Dup", roles: ["user"] })).code)
            .toBe("users.email_taken")
    })

    it("forces the password change before anything else", async () => {
        expect((await member.post("/api/auth/login", { email: "member@example.test", password: memberPassword })).status).toBe(200)
        expect((await member.get("/api/auth/me")).data.mustChangePassword).toBe(true)
        expect((await member.patch("/api/account", { name: "M" })).code).toBe("auth.password_change_required")
        expect((await member.post("/api/account/password", { current: "wrong", next: "member-password-123" })).code)
            .toBe("account.wrong_password")
        expect((await member.post("/api/account/password", { current: memberPassword, next: "member-password-123" })).status)
            .toBe(200)
        expect((await member.patch("/api/account", { name: "Member Two" })).data.name).toBe("Member Two")
    })

    it("denies what the role does not grant", async () => {
        const response = await member.get("/api/admin/users")
        expect([response.status, response.code]).toEqual([403, "auth.forbidden"])
    })

    it("signs other devices out when the password changes", async () => {
        await memberSecondDevice.post("/api/auth/login", { email: "member@example.test", password: "member-password-123" })
        expect((await memberSecondDevice.get("/api/auth/me")).status).toBe(200)
        await member.post("/api/account/password", { current: "member-password-123", next: "member-password-456" })
        expect((await memberSecondDevice.get("/api/auth/me")).status).toBe(401)
        expect((await member.get("/api/auth/me")).status).toBe(200)
    })

    it("lists and revokes the user's own sessions", async () => {
        const other = createClient()
        await other.post("/api/auth/login", { email: "member@example.test", password: "member-password-456" })
        const sessions = (await member.get("/api/account/sessions")).data as { id: string, current: boolean }[]
        expect(sessions.filter(session => session.current)).toHaveLength(1)
        const target = sessions.find(session => !session.current)!
        expect((await member.delete(`/api/account/sessions/${target.id}`)).status).toBe(200)
        expect((await other.get("/api/auth/me")).status).toBe(401)
        expect((await admin.delete(`/api/account/sessions/${target.id}`)).code).toBe("sessions.not_found")
    })

    it("cuts a deactivated user off on the next request", async () => {
        expect((await admin.patch(`/api/admin/users/${memberId}`, { active: false })).status).toBe(200)
        expect((await member.get("/api/auth/me")).status).toBe(401)
        expect((await member.post("/api/auth/login", { email: "member@example.test", password: "member-password-456" })).code)
            .toBe("auth.inactive")
        await admin.patch(`/api/admin/users/${memberId}`, { active: true })
    })

    it("protects the last admin and self-lockout", async () => {
        const me = (await admin.get("/api/auth/me")).data
        expect((await admin.patch(`/api/admin/users/${me.id}`, { roles: ["user"] })).code).toBe("users.self_lockout")
        expect((await admin.delete(`/api/admin/users/${me.id}`)).code).toBe("users.self_lockout")
    })

    it("resets a password and revokes the user's sessions", async () => {
        await member.post("/api/auth/login", { email: "member@example.test", password: "member-password-456" })
        const response = await admin.post(`/api/admin/users/${memberId}/reset-password`)
        expect(response.data.password).toMatch(/^\S{4}-\S{4}-\S{4}-\S{4}$/)
        expect((await member.get("/api/auth/me")).status).toBe(401)
    })

    it("runs an invite end to end, once", async () => {
        const invite = await admin.post("/api/admin/invites", { roles: ["editor"], email: "guest@example.test" })
        expect(invite.status).toBe(201)
        const token = invite.data.token as string
        expect((await createClient().get(`/api/invites/${token}`)).data).toEqual({ valid: true, email: "guest@example.test" })

        const guest = createClient()
        const mismatch = await guest.post(`/api/invites/${token}/accept`, { name: "Guest", email: "other@example.test", password: "guest-password-123" })
        expect(mismatch.code).toBe("invites.email_mismatch")
        expect((await guest.post(`/api/invites/${token}/accept`, { name: "Guest", email: "guest@example.test", password: "guest-password-123" })).status)
            .toBe(200)
        expect((await guest.get("/api/auth/me")).data.roles).toEqual(["editor"])
        const reuse = await createClient().post(`/api/invites/${token}/accept`, { name: "G2", email: "g2@example.test", password: "guest-password-123" })
        expect([reuse.status, reuse.code]).toEqual([410, "invites.invalid"])
    })

    it("lets an admin view the app as another role", async () => {
        const response = await admin.post("/api/auth/mimic", { roles: ["user"] })
        expect(response.data).toMatchObject({ effectiveRoles: ["user"], mimicking: true })
        expect((await admin.get("/api/admin/users")).code).toBe("auth.forbidden")
        await admin.delete("/api/auth/mimic")
        expect((await admin.get("/api/admin/users")).status).toBe(200)
    })

    it("validates settings and records the change", async () => {
        expect((await admin.put("/api/admin/settings/security.login", { value: { limit: -1 } })).code).toBe("settings.invalid")
        expect((await admin.put("/api/admin/settings/nope", { value: 1 })).code).toBe("settings.unknown")
        const audit = await admin.get("/api/admin/audit?action=users.create")
        expect(audit.data.total).toBeGreaterThanOrEqual(1)
    })

    it("closes the API to non-admins in maintenance", async () => {
        const guest = createClient()
        await guest.post("/api/auth/login", { email: "guest@example.test", password: "guest-password-123" })
        await admin.put("/api/admin/settings/maintenance.enabled", { value: true })
        expect((await guest.get("/api/account/sessions")).code).toBe("system.maintenance")
        expect((await admin.get("/api/admin/users")).status).toBe(200)
        expect((await guest.get("/api/settings/public")).data["maintenance.enabled"]).toBe(true)
        await admin.put("/api/admin/settings/maintenance.enabled", { value: false })
        expect((await guest.get("/api/account/sessions")).status).toBe(200)
    })

    it("throttles repeated logins", async () => {
        await admin.put("/api/admin/settings/security.login", { value: { limit: 2, windowMinutes: 1 } })
        const attacker = createClient()
        const statuses = []
        for (let i = 0; i < 3; i++) {
            statuses.push((await attacker.post("/api/auth/login", { email: ADMIN.email, password: "nope" })).status)
        }
        expect(statuses).toEqual([401, 401, 429])
        await admin.put("/api/admin/settings/security.login", { value: { limit: 8, windowMinutes: 5 } })
    })

    it("logs out and revokes the session", async () => {
        const client = createClient()
        await client.post("/api/auth/login", { email: ADMIN.email, password: ADMIN.password })
        const stolenCookie = new Map(client.jar)
        await client.post("/api/auth/logout")
        expect((await client.get("/api/auth/me")).status).toBe(401)
        const replay = createClient()
        for (const [name, value] of stolenCookie) replay.jar.set(name, value)
        expect((await replay.get("/api/auth/me")).status).toBe(401)
    })
})
