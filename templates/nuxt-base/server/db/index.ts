import type { MySql2Database } from "drizzle-orm/mysql2"
import { drizzle } from "drizzle-orm/mysql2"
import mysql from "mysql2/promise"
import * as schema from "./schema"

export type Db = MySql2Database<typeof schema>

let instance: Db | undefined

/** Lazily opens one pool per process, so importing this never needs a database. */
export function useDb(): Db {
    if (!instance) {
        const url = process.env.DATABASE_URL
        if (!url) throw new Error("DATABASE_URL is not set")
        const pool = mysql.createPool({ uri: url, connectionLimit: 10 })
        instance = drizzle(pool, { schema, mode: "default" })
    }
    return instance
}
