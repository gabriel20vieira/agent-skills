import type { H3Event } from "h3"
import { and, asc, count, eq, sql } from "drizzle-orm"
import type { z } from "zod"
import type { userCreateSchema, userUpdateSchema } from "#shared/schemas/users"
import { users } from "../db/schema"
import type { UserRow } from "../db/schema"
import { checkAdminInvariant } from "../utils/adminInvariant"
import { generatePassword } from "../utils/tokens"

export interface ServiceContext {
    event: H3Event
    actor: AuthUser
}

/** What the admin UI sees about an account (never the hash). */
export function toPublicUser(row: UserRow) {
    return {
        id: row.id,
        email: row.email,
        name: row.name,
        roles: row.roles,
        active: row.active,
        mustChangePassword: row.mustChangePassword,
        lastLoginAt: row.lastLoginAt,
        createdAt: row.createdAt,
    }
}
export type PublicUser = ReturnType<typeof toPublicUser>

export async function findUserById(id: number): Promise<UserRow | undefined> {
    const [row] = await useDb().select().from(users).where(eq(users.id, id)).limit(1)
    return row
}

export async function findUserByEmail(email: string): Promise<UserRow | undefined> {
    const [row] = await useDb().select().from(users).where(eq(users.email, email)).limit(1)
    return row
}

export async function countUsers(): Promise<number> {
    const [row] = await useDb().select({ value: count() }).from(users)
    return row?.value ?? 0
}

export async function countActiveAdmins(): Promise<number> {
    const [row] = await useDb()
        .select({ value: count() })
        .from(users)
        .where(and(eq(users.active, true), sql`json_contains(${users.roles}, '"admin"')`))
    return row?.value ?? 0
}

export async function listUsers(): Promise<PublicUser[]> {
    const rows = await useDb().select().from(users).orderBy(asc(users.name))
    return rows.map(toPublicUser)
}

function isDuplicate(error: unknown) {
    return (error as { cause?: { code?: string }, code?: string })?.cause?.code === "ER_DUP_ENTRY"
        || (error as { code?: string })?.code === "ER_DUP_ENTRY"
}

/** Without a password, one is generated, returned once, and must be changed at first login. */
export async function createUser(ctx: ServiceContext, input: z.infer<typeof userCreateSchema>) {
    if (await findUserByEmail(input.email)) throw fail(409, "users.email_taken")
    const generatedPassword = input.password ? undefined : generatePassword()
    let id: number
    try {
        const [result] = await useDb().insert(users).values({
            email: input.email,
            name: input.name,
            roles: input.roles,
            passwordHash: await hashPassword(input.password ?? generatedPassword!),
            mustChangePassword: !input.password,
        }).$returningId()
        id = result!.id
    }
    catch (error) {
        if (isDuplicate(error)) throw fail(409, "users.email_taken")
        throw error
    }
    await audit(ctx.event, { action: "users.create", resource: "users", resourceId: id, meta: { roles: input.roles } })
    return { user: toPublicUser((await findUserById(id))!), generatedPassword }
}

async function guardAdminChange(ctx: ServiceContext, target: UserRow, next: { active: boolean, roles: Role[] } | "delete") {
    const code = checkAdminInvariant({
        actorId: ctx.actor.id,
        targetId: target.id,
        targetIsActiveAdmin: target.active && target.roles.includes("admin"),
        next,
        activeAdminCount: await countActiveAdmins(),
    })
    if (code) throw fail(409, code)
}

export async function updateUser(ctx: ServiceContext, id: number, patch: z.infer<typeof userUpdateSchema>) {
    const target = await findUserById(id)
    if (!target) throw fail(404, "users.not_found")
    const next = { active: patch.active ?? target.active, roles: patch.roles ?? target.roles }
    await guardAdminChange(ctx, target, next)
    await useDb().update(users).set({ name: patch.name ?? target.name, ...next }).where(eq(users.id, id))
    if (!next.active) await revokeUserSessions(id)
    await audit(ctx.event, { action: "users.update", resource: "users", resourceId: id, meta: { ...patch } })
    return toPublicUser((await findUserById(id))!)
}

export async function resetUserPassword(ctx: ServiceContext, id: number) {
    const target = await findUserById(id)
    if (!target) throw fail(404, "users.not_found")
    const password = generatePassword()
    await useDb().update(users).set({
        passwordHash: await hashPassword(password),
        passwordVersion: target.passwordVersion + 1,
        mustChangePassword: true,
    }).where(eq(users.id, id))
    await revokeUserSessions(id)
    await audit(ctx.event, { action: "users.reset_password", resource: "users", resourceId: id })
    return { password }
}

export async function deleteUser(ctx: ServiceContext, id: number) {
    const target = await findUserById(id)
    if (!target) throw fail(404, "users.not_found")
    await guardAdminChange(ctx, target, "delete")
    await useDb().delete(users).where(eq(users.id, id))
    await audit(ctx.event, { action: "users.delete", resource: "users", resourceId: id, meta: { email: target.email } })
}
