import { json, mysqlTable, timestamp, varchar } from "drizzle-orm/mysql-core"

/** Key/value overrides for env defaults. Values are validated per key with zod on read. */
export const settings = mysqlTable("settings", {
    key: varchar("key", { length: 128 }).primaryKey(),
    value: json("value").notNull(),
    updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
})
