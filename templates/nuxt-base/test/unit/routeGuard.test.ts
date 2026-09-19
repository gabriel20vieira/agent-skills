import { describe, expect, it } from "vitest"
import { resolveRoute } from "../../app/utils/routeGuard"
import type { GuardState } from "../../app/utils/routeGuard"
import type { AuthUser } from "#shared/types/auth"

function user(overrides: Partial<AuthUser> = {}): AuthUser {
    return {
        id: 1,
        name: "U",
        email: "u@x.pt",
        roles: ["user"],
        effectiveRoles: ["user"],
        mimicking: false,
        passwordVersion: 1,
        mustChangePassword: false,
        locale: null,
        theme: null,
        ...overrides,
    }
}

const state = (overrides: Partial<GuardState> = {}): GuardState =>
    ({ needsSetup: false, maintenance: false, user: null, ...overrides })

const route = (path: string, meta: Record<string, unknown> = {}) => ({ path, fullPath: path, meta })

describe("resolveRoute", () => {
    it("sends everyone to /setup until the first admin exists", () => {
        expect(resolveRoute(state({ needsSetup: true }), route("/app"))).toEqual({ redirect: "/setup" })
        expect(resolveRoute(state({ needsSetup: true }), route("/setup", { auth: "guest" }))).toBeNull()
    })
    it("closes /setup once it is done", () => {
        expect(resolveRoute(state(), route("/setup", { auth: "guest" }))).toEqual({ redirect: "/entrar" })
    })
    it("lets anyone see public pages", () => {
        expect(resolveRoute(state(), route("/", { auth: false }))).toBeNull()
    })
    it("asks anonymous visitors to sign in, keeping the target", () => {
        expect(resolveRoute(state(), route("/app?x=1"))).toEqual({ redirect: "/entrar?redirect=%2Fapp%3Fx%3D1" })
    })
    it("keeps signed-in users off guest pages", () => {
        expect(resolveRoute(state({ user: user() }), route("/entrar", { auth: "guest" }))).toEqual({ redirect: "/app" })
    })
    it("forces the password change first", () => {
        const s = state({ user: user({ mustChangePassword: true }) })
        expect(resolveRoute(s, route("/app"))).toEqual({ redirect: "/conta/password" })
        expect(resolveRoute(s, route("/conta/password"))).toBeNull()
    })
    it("checks page permissions against effective roles", () => {
        const meta = { permission: ["users", "read"] }
        expect(resolveRoute(state({ user: user() }), route("/admin/utilizadores", meta))).toEqual({ error: 403 })
        const admin = user({ roles: ["admin"], effectiveRoles: ["admin"] })
        expect(resolveRoute(state({ user: admin }), route("/admin/utilizadores", meta))).toBeNull()
        const mimicking = user({ roles: ["admin"], effectiveRoles: ["user"], mimicking: true })
        expect(resolveRoute(state({ user: mimicking }), route("/admin/utilizadores", meta))).toEqual({ error: 403 })
    })
    it("shows maintenance to everyone but real admins", () => {
        expect(resolveRoute(state({ maintenance: true, user: user() }), route("/app"))).toEqual({ redirect: "/manutencao" })
        expect(resolveRoute(state({ maintenance: true }), route("/entrar", { auth: "guest" }))).toBeNull()
        const admin = user({ roles: ["admin"], effectiveRoles: ["user"], mimicking: true })
        expect(resolveRoute(state({ maintenance: true, user: admin }), route("/app"))).toBeNull()
        expect(resolveRoute(state(), route("/manutencao", { auth: false }))).toEqual({ redirect: "/" })
    })
})
