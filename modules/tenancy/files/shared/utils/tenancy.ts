/**
 * Organisation roles are separate from the global roles in permissions.ts: the global
 * matrix says what someone may do in the app, the organisation role what they may do
 * inside one organisation.
 */
export const ORG_ROLES = ["owner", "admin", "member"] as const
export type OrgRole = (typeof ORG_ROLES)[number]

export const ORG_ACTIONS = ["read", "write", "manage_members", "manage_org", "delete_org"] as const
export type OrgAction = (typeof ORG_ACTIONS)[number]

const ORG_PERMISSIONS: Record<OrgRole, readonly OrgAction[]> = {
    owner: ORG_ACTIONS,
    admin: ["read", "write", "manage_members", "manage_org"],
    member: ["read", "write"],
}

export function orgCan(role: OrgRole | null | undefined, action: OrgAction): boolean {
    return !!role && ORG_PERMISSIONS[role].includes(action)
}

/** Only owners may make or unmake owners. */
export function canAssignOrgRole(actor: OrgRole, from: OrgRole | null, to: OrgRole): boolean {
    if (!orgCan(actor, "manage_members")) return false
    if (to === "owner" || from === "owner") return actor === "owner"
    return true
}

export const ORG_COOKIE = "org"
