import { index, int, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core"
import { users } from "./users"

/** The reference resource. New resources copy this shape (see the web-crud-resource skill). */
export const notes = mysqlTable("notes", {
    id: int("id").autoincrement().primaryKey(),
    title: varchar("title", { length: 200 }).notNull(),
    body: text("body").notNull(),
    authorId: int("author_id").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
}, table => [index("notes_updated_at_idx").on(table.updatedAt)])

export type NoteRow = typeof notes.$inferSelect
