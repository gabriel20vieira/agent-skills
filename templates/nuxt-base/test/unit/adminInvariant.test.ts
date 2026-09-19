import { describe, expect, it } from "vitest"
import { checkAdminInvariant } from "../../server/utils/adminInvariant"

const base = { actorId: 1, targetId: 2, targetIsActiveAdmin: true, activeAdminCount: 2 }

describe("checkAdminInvariant", () => {
    it("allows a valid change", () => {
        expect(checkAdminInvariant({ ...base, next: { active: true, roles: ["user"] } })).toBeNull()
    })
    it("blocks deactivating the last admin", () => {
        expect(checkAdminInvariant({ ...base, activeAdminCount: 1, next: { active: false, roles: ["admin"] } }))
            .toBe("users.last_admin")
    })
    it("blocks removing admin from the last admin", () => {
        expect(checkAdminInvariant({ ...base, activeAdminCount: 1, next: { active: true, roles: ["user"] } }))
            .toBe("users.last_admin")
    })
    it("blocks deleting the last admin", () => {
        expect(checkAdminInvariant({ ...base, activeAdminCount: 1, next: "delete" })).toBe("users.last_admin")
    })
    it("blocks self-deactivation, self-demotion and self-deletion", () => {
        const self = { ...base, targetId: 1 }
        expect(checkAdminInvariant({ ...self, next: { active: false, roles: ["admin"] } })).toBe("users.self_lockout")
        expect(checkAdminInvariant({ ...self, next: { active: true, roles: ["user"] } })).toBe("users.self_lockout")
        expect(checkAdminInvariant({ ...self, next: "delete" })).toBe("users.self_lockout")
    })
    it("ignores non-admin targets", () => {
        expect(checkAdminInvariant({ ...base, targetIsActiveAdmin: false, activeAdminCount: 1, next: "delete" }))
            .toBeNull()
    })
})
