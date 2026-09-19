import { describe, expect, it } from "vitest"
import { canAssignOrgRole, orgCan } from "#shared/utils/tenancy"

describe("organisation roles", () => {
    it("grant actions by role", () => {
        expect(orgCan("member", "write")).toBe(true)
        expect(orgCan("member", "manage_members")).toBe(false)
        expect(orgCan("admin", "manage_members")).toBe(true)
        expect(orgCan("admin", "delete_org")).toBe(false)
        expect(orgCan("owner", "delete_org")).toBe(true)
        expect(orgCan(null, "read")).toBe(false)
    })
    it("let only owners make or unmake owners", () => {
        expect(canAssignOrgRole("admin", "member", "admin")).toBe(true)
        expect(canAssignOrgRole("admin", "member", "owner")).toBe(false)
        expect(canAssignOrgRole("admin", "owner", "member")).toBe(false)
        expect(canAssignOrgRole("owner", "owner", "member")).toBe(true)
        expect(canAssignOrgRole("member", null, "member")).toBe(false)
    })
})
