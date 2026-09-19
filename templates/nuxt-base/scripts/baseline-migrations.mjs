import { createHash } from "node:crypto"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import mysql from "mysql2/promise"
import { decideBaseline } from "./lib/baseline.mjs"

// Brings a database created by `drizzle-kit push` under migration control, so
// `drizzle-kit migrate` can run unattended on every deploy. See lib/baseline.mjs.

const drizzleDir = join(dirname(fileURLToPath(import.meta.url)), "..", "drizzle")
const journal = JSON.parse(readFileSync(join(drizzleDir, "meta", "_journal.json"), "utf8"))
const baseline = journal.entries.find(entry => entry.idx === 0)
if (!baseline) {
    console.error("[baseline] drizzle/meta/_journal.json has no entry 0.")
    process.exit(1)
}

const baselineSql = readFileSync(join(drizzleDir, `${baseline.tag}.sql`), "utf8")
// The same hash drizzle-kit stores: sha256 over the raw file.
const baselineHash = createHash("sha256").update(baselineSql).digest("hex")
const baselineTables = [...baselineSql.matchAll(/CREATE TABLE `([^`]+)`/g)].map(match => match[1])

const url = process.env.DATABASE_URL
if (!url) {
    console.error("[baseline] DATABASE_URL is not set.")
    process.exit(1)
}

const connection = await mysql.createConnection(url)
try {
    const [rows] = await connection.query(
        "SELECT table_name AS name FROM information_schema.tables WHERE table_schema = DATABASE()",
    )
    const tables = rows.map(row => row.name)
    let historyCount = 0
    if (tables.includes("__drizzle_migrations")) {
        const [[{ count }]] = await connection.query("SELECT COUNT(*) AS count FROM `__drizzle_migrations`")
        historyCount = Number(count)
    }

    const decision = decideBaseline({ tables, historyCount, baselineTables })
    if (decision.action === "none") {
        console.log(`[baseline] Nothing to do (${decision.reason}).`)
    }
    else if (decision.action === "refuse") {
        console.error(
            `[baseline] Tables exist but ${decision.missing.join(", ")} (created by ${baseline.tag}) `
            + "are missing. Refusing to record the baseline over an unknown schema.",
        )
        process.exitCode = 1
    }
    else {
        await connection.query(
            "CREATE TABLE IF NOT EXISTS `__drizzle_migrations` ("
            + "`id` bigint unsigned NOT NULL AUTO_INCREMENT, `hash` text NOT NULL, "
            + "`created_at` bigint DEFAULT NULL, PRIMARY KEY (`id`), UNIQUE KEY `id` (`id`))",
        )
        await connection.query(
            "INSERT INTO `__drizzle_migrations` (`hash`, `created_at`) VALUES (?, ?)",
            [baselineHash, baseline.when],
        )
        console.log(`[baseline] Existing tables match ${baseline.tag}; recorded it as applied.`)
    }
}
finally {
    await connection.end()
}
