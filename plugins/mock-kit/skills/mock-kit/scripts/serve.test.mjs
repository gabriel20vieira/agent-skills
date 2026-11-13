// node --test plugins/mock-kit/skills/mock-kit/scripts/serve.test.mjs
import assert from "node:assert/strict"
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { request } from "node:http"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { after, test } from "node:test"
import { launchEntry, startServer } from "./serve.mjs"

const base = mkdtempSync(join(tmpdir(), "mock-kit-serve-"))
const root = join(base, "mocks")
mkdirSync(join(root, "_kit"), { recursive: true })
writeFileSync(join(root, "index.html"), "<h1>index</h1>")
writeFileSync(join(root, "_kit", "kit.js"), "export {}")
writeFileSync(join(base, "secret.txt"), "secret")
after(() => rmSync(base, { recursive: true, force: true }))

function get(port, path) {
    return new Promise((resolve, reject) => {
        const req = request({ host: "127.0.0.1", port, path, method: "GET" }, (res) => {
            let body = ""
            res.on("data", (chunk) => { body += chunk })
            res.on("end", () => resolve({ status: res.statusCode, type: res.headers["content-type"], body }))
        })
        req.on("error", reject)
        req.end()
    })
}

test("serves files from the mocks folder on 127.0.0.1 only, with MIME types", async () => {
    const { server, port } = await startServer({ root, port: 0 })
    try {
        assert.equal(server.address().address, "127.0.0.1")
        const index = await get(port, "/")
        assert.equal(index.status, 200)
        assert.match(index.type, /text\/html/)
        assert.equal(index.body, "<h1>index</h1>")
        const kit = await get(port, "/_kit/kit.js")
        assert.match(kit.type, /javascript/)
        assert.equal((await get(port, "/nope.html")).status, 404)
    } finally {
        server.close()
    }
})

test("refuses paths that leave the folder", async () => {
    const { server, port } = await startServer({ root, port: 0 })
    try {
        for (const path of ["/../secret.txt", "/%2e%2e/secret.txt", "/_kit/%2E%2E/%2E%2E/secret.txt", "/..%5csecret.txt"]) {
            const res = await get(port, path)
            assert.equal(res.status, 403, path)
            assert.doesNotMatch(res.body, /secret/)
        }
    } finally {
        server.close()
    }
})

test("launchEntry gives the .claude/launch.json configuration", () => {
    assert.deepEqual(launchEntry({ script: "/p/mock-kit.mjs", dir: "docs/mocks", port: 8765 }), {
        name: "mocks",
        runtimeExecutable: "node",
        runtimeArgs: ["/p/mock-kit.mjs", "serve", "--dir", "docs/mocks", "--port", "8765"],
        port: 8765,
    })
})
