import { desc, eq } from "drizzle-orm"
import type { NoteCreate, NoteUpdate } from "#shared/schemas/notes"
import { notes, users } from "../db/schema"
import type { ServiceContext } from "./users"

// The reference service: read helpers, then writes that audit and publish after the change.

const noteColumns = {
    id: notes.id,
    title: notes.title,
    body: notes.body,
    authorId: notes.authorId,
    authorName: users.name,
    createdAt: notes.createdAt,
    updatedAt: notes.updatedAt,
}

export type Note = Awaited<ReturnType<typeof listNotes>>[number]

export async function listNotes() {
    return useDb().select(noteColumns).from(notes).leftJoin(users, eq(users.id, notes.authorId)).orderBy(desc(notes.updatedAt), desc(notes.id))
}

export async function getNote(id: number) {
    const [row] = await useDb().select(noteColumns).from(notes).leftJoin(users, eq(users.id, notes.authorId)).where(eq(notes.id, id)).limit(1)
    if (!row) throw fail(404, "notes.not_found")
    return row
}

function announce(event: string, id: number) {
    realtime.publish(resourceTopic("notes"), `notes.${event}`, { id })
    realtime.publish(resourceTopic("notes", id), `notes.${event}`, { id })
}

export async function createNote(ctx: ServiceContext, input: NoteCreate) {
    const [result] = await useDb().insert(notes).values({ ...input, authorId: ctx.actor.id }).$returningId()
    const id = result!.id
    await audit(ctx.event, { action: "notes.create", resource: "notes", resourceId: id })
    announce("created", id)
    return getNote(id)
}

export async function updateNote(ctx: ServiceContext, id: number, input: NoteUpdate) {
    await getNote(id)
    await useDb().update(notes).set(input).where(eq(notes.id, id))
    await audit(ctx.event, { action: "notes.update", resource: "notes", resourceId: id })
    announce("updated", id)
    return getNote(id)
}

export async function deleteNote(ctx: ServiceContext, id: number) {
    await getNote(id)
    await useDb().delete(notes).where(eq(notes.id, id))
    await audit(ctx.event, { action: "notes.delete", resource: "notes", resourceId: id })
    announce("deleted", id)
}
