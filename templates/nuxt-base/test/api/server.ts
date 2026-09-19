import { spawn } from "node:child_process"
import type { ChildProcess } from "node:child_process"
import { createServer } from "node:net"
import { freshDatabase, TEST_ENV } from "./database"

export interface TestApp {
    baseUrl: string
    logs: string[]
    stop(): Promise<void>
}

function freePort(): Promise<number> {
    return new Promise((resolve, reject) => {
        const server = createServer()
        server.once("error", reject)
        server.listen(0, "127.0.0.1", () => {
            const { port } = server.address() as { port: number }
            server.close(() => resolve(port))
        })
    })
}

/** Starts the built server (.output) on a free port against a fresh `<db>_test_<name>`. */
export async function startApp(name: string): Promise<TestApp> {
    const databaseUrl = await freshDatabase(name)
    const port = await freePort()
    const logs: string[] = []
    const child: ChildProcess = spawn(process.execPath, [".output/server/index.mjs"], {
        env: { ...process.env, ...TEST_ENV, DATABASE_URL: databaseUrl, PORT: String(port), HOST: "127.0.0.1", NODE_ENV: "production" },
        stdio: ["ignore", "pipe", "pipe"],
    })
    child.stdout?.on("data", chunk => logs.push(String(chunk)))
    child.stderr?.on("data", chunk => logs.push(String(chunk)))

    const baseUrl = `http://127.0.0.1:${port}`
    const deadline = Date.now() + 30_000
    for (;;) {
        if (child.exitCode !== null) throw new Error(`server exited:\n${logs.join("")}`)
        try {
            if ((await fetch(`${baseUrl}/api/health`)).ok) break
        }
        catch {
            // not listening yet
        }
        if (Date.now() > deadline) throw new Error(`server did not start:\n${logs.join("")}`)
        await new Promise(resolve => setTimeout(resolve, 200))
    }

    return {
        baseUrl,
        logs,
        stop: () => new Promise((resolve) => {
            if (child.exitCode !== null) return resolve()
            child.once("exit", () => resolve())
            child.kill()
        }),
    }
}
