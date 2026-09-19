import { defineConfig } from "drizzle-kit"

try {
    process.loadEnvFile(".env")
}
catch {
    // No .env (e.g. inside Docker): the variables are already in the environment.
}

export default defineConfig({
    schema: "./server/db/schema/index.ts",
    out: "./drizzle",
    dialect: "mysql",
    dbCredentials: { url: process.env.DATABASE_URL ?? "" },
})
