import { index, int, mysqlTable, primaryKey, timestamp, varchar } from "drizzle-orm/mysql-core"
import type { OrgRole } from "#shared/utils/tenancy"
import { users } from "./users"

export const organizations = mysqlTable("organizations", {
    id: int("id").autoincrement().primaryKey(),
    name: varchar("name", { length: 120 }).notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
})

/** Who belongs to which organisation, and with which organisation role. */
export const memberships = mysqlTable("memberships", {
    orgId: int("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    role: varchar("role", { length: 16 }).$type<OrgRole>().notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
}, table => [
    primaryKey({ columns: [table.orgId, table.userId] }),
    index("memberships_user_idx").on(table.userId),
])

export type OrganizationRow = typeof organizations.$inferSelect
export type MembershipRow = typeof memberships.$inferSelect
