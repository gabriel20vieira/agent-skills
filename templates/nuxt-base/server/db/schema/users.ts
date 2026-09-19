import { boolean, int, json, mysqlTable, timestamp, varchar } from "drizzle-orm/mysql-core"
import type { Role } from "../../../shared/utils/permissions"

export const users = mysqlTable("users", {
    id: int("id").autoincrement().primaryKey(),
    email: varchar("email", { length: 191 }).notNull().unique(),
    name: varchar("name", { length: 120 }).notNull(),
    passwordHash: varchar("password_hash", { length: 255 }).notNull(),
    roles: json("roles").$type<Role[]>().notNull(),
    active: boolean("active").notNull().default(true),
    mustChangePassword: boolean("must_change_password").notNull().default(false),
    /** Bumped on every password change; sessions sealed with an older value stop working. */
    passwordVersion: int("password_version").notNull().default(1),
    locale: varchar("locale", { length: 10 }),
    theme: varchar("theme", { length: 32 }),
    lastLoginAt: timestamp("last_login_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
})

export type UserRow = typeof users.$inferSelect
