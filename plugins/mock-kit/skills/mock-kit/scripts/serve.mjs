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

const MAX_BODY = 16 * 1024

function send(res, status, body, type = "text/plain; charset=utf-8") {
    res.writeHead(status, { "content-type": type, "cache-control": "no-store" })
    res.end(body)
}

/** POST /_kit/choice: the mock bar records the variant and options shown, through saveChoice. */
function receiveChoice(req, res, saveChoice) {
    let body = ""
    let tooBig = false
    req.on("data", (chunk) => {
        if (tooBig) return
        body += chunk
        if (body.length > MAX_BODY) tooBig = true
    })
    req.on("end", () => {
        if (tooBig) return send(res, 413, "Too large")
        let choice
        try {
            choice = JSON.parse(body)
        } catch {
            return send(res, 400, "Invalid JSON")
        }
        try {
            send(res, 200, JSON.stringify(saveChoice(choice)), TYPES[".json"])
        } catch (error) {
            send(res, 400, String(error?.message ?? error))
        }
    })
}

/**
 * Starts the server; resolves with { server, port, url }.
 * - renderIndex(): when given, / and /index.html are rendered on each request (always current).
 * - saveChoice({ file, variant, options }): when given, POST /_kit/choice records the mock's choice.
 */
export function startServer({ root, port = 8765, host = "127.0.0.1", renderIndex = null, saveChoice = null }) {
    const server = createServer((req, res) => {
        const path = (req.url ?? "/").split(/[?#]/)[0]
        if (path === "/_kit/choice") {
            if (!saveChoice || req.method !== "POST") return send(res, 405, "Method not allowed")
            return receiveChoice(req, res, saveChoice)
        }
        if (renderIndex && (path === "/" || path === "/index.html")) {
            try {
                return send(res, 200, renderIndex(), TYPES[".html"])
            } catch (error) {
                return send(res, 500, String(error?.message ?? error))
            }
        }
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
