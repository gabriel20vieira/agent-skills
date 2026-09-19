import { describe, expect, it } from "vitest"
import { can, PERMISSIONS, RESOURCES, ROLES } from "../../shared/utils/permissions"

describe("can", () => {
    it("lets admin do everything on every resource", () => {
        for (const resource of RESOURCES) {
            for (const action of ["read", "create", "update", "delete", "manage"] as const) {
                expect(can(["admin"], resource, action)).toBe(true)
            }
        }
    })
    it("gives editor CRUD on notes but nothing on users", () => {
        expect(can(["editor"], "notes", "update")).toBe(true)
        expect(can(["editor"], "notes", "delete")).toBe(true)
        expect(can(["editor"], "users", "read")).toBe(false)
    })
    it("gives user read-only notes", () => {
        expect(can(["user"], "notes", "read")).toBe(true)
        expect(can(["user"], "notes", "create")).toBe(false)
        expect(can(["user"], "settings", "read")).toBe(false)
    })
    it("treats manage as every action", () => {
        expect(can(["admin"], "settings", "delete")).toBe(true)
        expect(PERMISSIONS.admin.settings).toContain("manage")
    })
    it("unions multiple roles", () => {
        expect(can(["user", "editor"], "notes", "create")).toBe(true)
    })
    it("denies everything without roles", () => {
        expect(can([], "notes", "read")).toBe(false)
    })
    it("has an entry for every role", () => {
        for (const role of ROLES) expect(PERMISSIONS[role]).toBeDefined()
    })
})
