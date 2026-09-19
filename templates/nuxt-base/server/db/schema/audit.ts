import { bigint, index, int, json, mysqlTable, timestamp, varchar } from "drizzle-orm/mysql-core"

/** Who did what: admin actions, permission changes, assistant writes. No foreign key, so
 * the trail survives the user being deleted. */
export const auditLog = mysqlTable("audit_log", {
    id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
    userId: int("user_id"),
    action: varchar("action", { length: 64 }).notNull(),
    resource: varchar("resource", { length: 64 }).notNull(),
    resourceId: varchar("resource_id", { length: 64 }),
    meta: json("meta").$type<Record<string, unknown>>(),
    ip: varchar("ip", { length: 64 }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
}, table => [index("audit_log_created_at_idx").on(table.createdAt)])

export type AuditRow = typeof auditLog.$inferSelect
