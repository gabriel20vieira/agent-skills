import mysql from "mysql2/promise"

const url = process.env.DATABASE_URL
if (!url) {
    console.error("[wait-for-db] DATABASE_URL is not set.")
    process.exit(1)
}

const attempts = Number(process.env.DB_WAIT_ATTEMPTS ?? 60)
for (let i = 1; i <= attempts; i++) {
    try {
        const connection = await mysql.createConnection(url)
        await connection.query("SELECT 1")
        await connection.end()
        console.log("[wait-for-db] Database is ready.")
        process.exit(0)
    }
    catch {
        console.log(`[wait-for-db] Not ready (${i}/${attempts}), retrying in 2s...`)
        await new Promise(resolve => setTimeout(resolve, 2000))
    }
}
console.error("[wait-for-db] Gave up waiting for the database.")
process.exit(1)
