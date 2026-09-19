import { char, int, json, mysqlTable, timestamp, varchar } from "drizzle-orm/mysql-core"
import type { Role } from "../../../shared/utils/permissions"
import { users } from "./users"

export const invites = mysqlTable("invites", {
    id: int("id").autoincrement().primaryKey(),
    /** sha256 of the token; the token itself only exists in the link that was handed out. */
    tokenHash: char("token_hash", { length: 64 }).notNull().unique(),
    email: varchar("email", { length: 191 }),
    roles: json("roles").$type<Role[]>().notNull(),
    createdBy: int("created_by").references(() => users.id, { onDelete: "set null" }),
    expiresAt: timestamp("expires_at").notNull(),
    usedAt: timestamp("used_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
})

export type InviteRow = typeof invites.$inferSelect
