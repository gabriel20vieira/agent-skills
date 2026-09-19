import { drizzle } from "drizzle-orm/mysql2"
import { migrate } from "drizzle-orm/mysql2/migrator"
import mysql from "mysql2/promise"

/**
 * Recreates `<database>_test_<name>` from the migrations and returns its URL. One per
 * test file, so files never depend on each other's data or run order.
 */
export async function freshDatabase(name: string): Promise<string> {
    try {
        process.loadEnvFile(".env")
    }
    catch {
        // CI provides the variables directly.
    }
    const base = new URL(process.env.DATABASE_URL ?? "")
    const user = decodeURIComponent(base.username)
    const database = `${base.pathname.slice(1)}_test_${name}`

    const root = await mysql.createConnection({
        host: base.hostname,
        port: Number(base.port || 3306),
        user: "root",
        password: process.env.MYSQL_ROOT_PASSWORD,
    })
    await root.query(`DROP DATABASE IF EXISTS \`${database}\``)
    await root.query(`CREATE DATABASE \`${database}\``)
    await root.query(`GRANT ALL PRIVILEGES ON \`${database}\`.* TO ?@'%'`, [user])
    await root.end()

    const url = new URL(base)
    url.pathname = `/${database}`
    const connection = await mysql.createConnection(url.toString())
    await migrate(drizzle(connection), { migrationsFolder: "drizzle" })
    await connection.end()
    return url.toString()
}

export const TEST_ENV = {
    NUXT_SESSION_PASSWORD: "test-session-secret-0123456789-abcdefghijklmnopqrstuvwxyz",
    NUXT_SETUP_CODE: "TEST-SETUP-CODE",
}
