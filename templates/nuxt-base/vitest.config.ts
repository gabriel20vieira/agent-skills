import { fileURLToPath } from "node:url"
import { defineConfig } from "vitest/config"

export default defineConfig({
    // Same alias Nuxt 4 provides, so shared code imports the same way everywhere.
    resolve: { alias: { "#shared": fileURLToPath(new URL("./shared", import.meta.url)) } },
    test: {
        projects: [
            {
                test: {
                    name: "unit",
                    include: ["test/unit/**/*.test.ts"],
                    environment: "node",
                },
            },
            {
                // Builds the app and runs it against a fresh MySQL database (<db>_test).
                // Needs the compose db: `docker compose up -d db`.
                test: {
                    name: "api",
                    include: ["test/api/**/*.test.ts"],
                    environment: "node",
                    globalSetup: ["test/api/globalSetup.ts"],
                    fileParallelism: false,
                    testTimeout: 30_000,
                    hookTimeout: 600_000,
                },
            },
        ],
    },
})
