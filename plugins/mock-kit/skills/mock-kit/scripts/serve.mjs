// A static file server for the mocks folder, on 127.0.0.1 only, so ES modules and the
// importmap work without a build step. No dependencies.
import { createReadStream, existsSync, statSync } from "node:fs"
import { createServer } from "node:http"
import { extname, join, resolve, sep } from "node:path"

const TYPES = {
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".mjs": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
    ".gif": "image/gif",
    ".ico": "image/x-icon",
    ".woff2": "font/woff2",
    ".txt": "text/plain; charset=utf-8",
}

/** The file a request path maps to, or null when the path tries to leave root. */
export function resolveRequest(root, rawUrl) {
    let path
    try {
        path = decodeURIComponent((rawUrl ?? "/").split(/[?#]/)[0])
    } catch {
        return null
    }
    const segments = path.replace(/\\/g, "/").split("/")
    if (segments.includes("..") || path.includes("\0")) return null
    const base = resolve(root)
    const target = resolve(join(base, ...segments.filter(Boolean)))
    if (target !== base && !target.startsWith(base + sep)) return null
    if (existsSync(target) && statSync(target).isDirectory()) return join(target, "index.html")
    return target
}

/** Starts the server; resolves with { server, port, url }. */
export function startServer({ root, port = 8765, host = "127.0.0.1" }) {
    const server = createServer((req, res) => {
        const file = resolveRequest(root, req.url)
        if (!file) {
            res.writeHead(403, { "content-type": "text/plain; charset=utf-8" })
            res.end("Forbidden")
            return
        }
        if (!existsSync(file) || !statSync(file).isFile()) {
            res.writeHead(404, { "content-type": "text/plain; charset=utf-8" })
            res.end("Not found")
            return
        }
        res.writeHead(200, { "content-type": TYPES[extname(file).toLowerCase()] ?? "application/octet-stream", "cache-control": "no-store" })
        createReadStream(file).pipe(res)
    })
    return new Promise((resolvePromise, reject) => {
        server.once("error", reject)
        server.listen(port, host, () => {
            const actual = server.address().port
            resolvePromise({ server, port: actual, url: `http://${host}:${actual}/` })
        })
    })
}

/** The entry for .claude/launch.json, so the agent can open the mocks in the browser pane. */
export function launchEntry({ script, dir, port }) {
    return { name: "mocks", runtimeExecutable: "node", runtimeArgs: [script, "serve", "--dir", dir, "--port", String(port)], port }
}
