import { drizzle } from "drizzle-orm/mysql2"
import { migrate } from "drizzle-orm/mysql2/migrator"
import mysql from "mysql2/promise"
import type { TestProject } from "vitest/node"

declare module "vitest" {
    export interface ProvidedContext {
        databaseUrl: string
    }
}

/** Recreates <database>_test from the migrations, so every run starts empty. */
export default async function setup(project: TestProject) {
    try {
        process.loadEnvFile(".env")
    }
    catch {
        // CI provides the variables directly.
    }
    const base = new URL(process.env.DATABASE_URL ?? "")
    const user = decodeURIComponent(base.username)
    const database = `${base.pathname.slice(1)}_test`

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

    const testUrl = new URL(base)
    testUrl.pathname = `/${database}`
    const connection = await mysql.createConnection(testUrl.toString())
    await migrate(drizzle(connection), { migrationsFolder: "drizzle" })
    await connection.end()

    project.provide("databaseUrl", testUrl.toString())
}
