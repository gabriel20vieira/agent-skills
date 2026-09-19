import { describe, expect, it } from "vitest"
import { authorizeTopic, parseClientMessage, resourceTopic, userTopic } from "#shared/utils/realtimeProtocol"
import type { AuthUser } from "#shared/types/auth"
import type { Role } from "#shared/utils/permissions"

function user(id: number, roles: Role[], effectiveRoles = roles): AuthUser {
    return {
        id,
        name: "U",
        email: "u@x.pt",
        roles,
        effectiveRoles,
        mimicking: roles !== effectiveRoles,
        passwordVersion: 1,
        mustChangePassword: false,
        locale: null,
        theme: null,
    }
}

describe("parseClientMessage", () => {
    it("accepts the protocol messages", () => {
        expect(parseClientMessage("{\"type\":\"subscribe\",\"topic\":\"res:notes\"}")).toEqual({ type: "subscribe", topic: "res:notes" })
        expect(parseClientMessage("{\"type\":\"ping\"}")).toEqual({ type: "ping" })
    })
    it("rejects garbage", () => {
        expect(parseClientMessage("not json")).toBeNull()
        expect(parseClientMessage("{\"type\":\"subscribe\"}")).toBeNull()
        expect(parseClientMessage("{\"type\":\"subscribe\",\"topic\":\"" + "x".repeat(200) + "\"}")).toBeNull()
        expect(parseClientMessage("{\"type\":\"drop-tables\"}")).toBeNull()
    })
})

describe("authorizeTopic", () => {
    it("builds topic names", () => {
        expect(userTopic(3)).toBe("user:3")
        expect(resourceTopic("notes")).toBe("res:notes")
        expect(resourceTopic("notes", 7)).toBe("res:notes:7")
    })
    it("lets a user follow only their own user topic", () => {
        expect(authorizeTopic(user(1, ["user"]), "user:1")).toBe(true)
        expect(authorizeTopic(user(1, ["admin"]), "user:2")).toBe(false)
    })
    it("requires read permission on resource topics", () => {
        expect(authorizeTopic(user(1, ["user"]), "res:notes")).toBe(true)
        expect(authorizeTopic(user(1, ["user"]), "res:notes:5")).toBe(true)
        expect(authorizeTopic(user(1, ["user"]), "res:users")).toBe(false)
        expect(authorizeTopic(user(1, ["admin"]), "res:users")).toBe(true)
        expect(authorizeTopic(user(1, ["admin"], ["user"]), "res:users")).toBe(false)
    })
    it("opens the system topic to everyone and rejects unknown topics", () => {
        expect(authorizeTopic(user(1, ["user"]), "system")).toBe(true)
        expect(authorizeTopic(user(1, ["admin"]), "res:unknown")).toBe(false)
        expect(authorizeTopic(user(1, ["admin"]), "whatever")).toBe(false)
    })
})
