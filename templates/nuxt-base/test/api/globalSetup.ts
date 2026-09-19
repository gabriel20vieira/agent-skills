import { execSync } from "node:child_process"

/**
 * Builds the app once for every API test file (each file then starts its own server on
 * the build, with its own database). SKIP_BUILD=1 reuses an existing .output.
 */
export default function setup() {
    if (process.env.SKIP_BUILD === "1") return
    execSync("npx nuxt build", { stdio: "inherit" })
}
