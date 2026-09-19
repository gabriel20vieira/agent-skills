import type { H3Event } from "h3"
import { and, desc, eq, gt, isNull } from "drizzle-orm"
import type { z } from "zod"
import type { inviteAcceptSchema, inviteCreateSchema } from "#shared/schemas/invites"
import { invites, users } from "../db/schema"
import type { InviteRow } from "../db/schema"
import { hashToken, newToken } from "../utils/tokens"
import { findUserByEmail, findUserById } from "./users"
import type { ServiceContext } from "./users"

function isUsable(row: InviteRow | undefined): row is InviteRow {
    return !!row && !row.usedAt && row.expiresAt > new Date()
}

async function findByToken(token: string) {
    const [row] = await useDb().select().from(invites).where(eq(invites.tokenHash, hashToken(token))).limit(1)
    return row
}

/** The token is returned once; only its hash is stored. */
export async function createInvite(ctx: ServiceContext, input: z.infer<typeof inviteCreateSchema>) {
    const token = newToken()
    const expiresAt = new Date(Date.now() + input.expiresInHours * 3_600_000)
    const [result] = await useDb().insert(invites).values({
        tokenHash: hashToken(token),
        email: input.email ?? null,
        roles: input.roles,
        createdBy: ctx.actor.id,
        expiresAt,
    }).$returningId()
    await audit(ctx.event, { action: "invites.create", resource: "users", resourceId: result!.id, meta: { roles: input.roles } })
    return { id: result!.id, token, expiresAt }
}

export async function listPendingInvites() {
    return useDb()
        .select({ id: invites.id, email: invites.email, roles: invites.roles, expiresAt: invites.expiresAt, createdAt: invites.createdAt })
        .from(invites)
        .where(and(isNull(invites.usedAt), gt(invites.expiresAt, new Date())))
        .orderBy(desc(invites.createdAt))
}

export async function deleteInvite(ctx: ServiceContext, id: number) {
    const [result] = await useDb().delete(invites).where(eq(invites.id, id))
    if (!result.affectedRows) throw fail(404, "invites.not_found")
    await audit(ctx.event, { action: "invites.delete", resource: "users", resourceId: id })
}

export async function describeInvite(token: string) {
    const row = await findByToken(token)
    return isUsable(row) ? { valid: true, email: row.email } : { valid: false, email: null }
}

/** Claims the invite atomically (used_at IS NULL), creates the account and signs in. */
export async function acceptInvite(event: H3Event, token: string, input: z.infer<typeof inviteAcceptSchema>) {
    const row = await findByToken(token)
    if (!isUsable(row)) throw fail(410, "invites.invalid")
    if (row.email && row.email !== input.email) throw fail(400, "invites.email_mismatch")
    if (await findUserByEmail(input.email)) throw fail(409, "users.email_taken")

    const passwordHash = await hashPassword(input.password)
    const userId = await useDb().transaction(async (tx) => {
        const [claim] = await tx.update(invites).set({ usedAt: new Date() })
            .where(and(eq(invites.id, row.id), isNull(invites.usedAt)))
        if (!claim.affectedRows) return null
        const [created] = await tx.insert(users).values({
            email: input.email,
            name: input.name,
            roles: row.roles,
            passwordHash,
        }).$returningId()
        return created!.id
    })
    if (!userId) throw fail(410, "invites.invalid")

    const user = (await findUserById(userId))!
    await createSession(event, user, false)
    await audit(event, { action: "invites.accept", resource: "users", resourceId: userId, userId })
    return user
}
