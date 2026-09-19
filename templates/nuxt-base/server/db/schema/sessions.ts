import { index, int, mysqlTable, timestamp, varchar } from "drizzle-orm/mysql-core"
import { users } from "./users"

/** One row per login: lets a session be listed, revoked and expired server-side. */
export const sessions = mysqlTable("sessions", {
    id: varchar("id", { length: 36 }).primaryKey(),
    userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    ip: varchar("ip", { length: 64 }).notNull().default(""),
    userAgent: varchar("user_agent", { length: 300 }).notNull().default(""),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    lastSeenAt: timestamp("last_seen_at").notNull().defaultNow(),
    expiresAt: timestamp("expires_at").notNull(),
    revokedAt: timestamp("revoked_at"),
}, table => [index("sessions_user_id_idx").on(table.userId)])

export type SessionRow = typeof sessions.$inferSelect
