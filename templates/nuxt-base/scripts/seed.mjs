import mysql from "mysql2/promise"
import { hashPassword } from "./lib/password.mjs"

/**
 * Creates the first admin from SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD (/ SEED_ADMIN_NAME)
 * when the users table is empty. Without those variables it does nothing, and the
 * /setup screen (NUXT_SETUP_CODE) is the way in.
 */
const email = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase()
const password = process.env.SEED_ADMIN_PASSWORD
const name = process.env.SEED_ADMIN_NAME?.trim() || "Admin"

if (!email || !password) {
    console.log("[seed] SEED_ADMIN_EMAIL/SEED_ADMIN_PASSWORD not set; skipping.")
    process.exit(0)
}
if (password.length < 12) {
    console.error("[seed] SEED_ADMIN_PASSWORD must have at least 12 characters.")
    process.exit(1)
}

const connection = await mysql.createConnection(process.env.DATABASE_URL)
try {
    const [[{ count }]] = await connection.query("SELECT COUNT(*) AS count FROM `users`")
    if (Number(count) > 0) {
        console.log("[seed] Users already exist; skipping.")
    }
    else {
        await connection.query(
            "INSERT INTO `users` (`email`, `name`, `password_hash`, `roles`) VALUES (?, ?, ?, ?)",
            [email, name, await hashPassword(password), JSON.stringify(["admin"])],
        )
        console.log(`[seed] Created admin ${email}.`)
    }
}
finally {
    await connection.end()
}
