// Screenshots of a mock with the machine's Chrome, Edge or Chromium in headless mode: every
// variant, on desktop and on mobile, into <dir>/_shots/.
import { execFile } from "node:child_process"
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join, win32 } from "node:path"
import { promisify } from "node:util"
import { startServer } from "./serve.mjs"

const run = promisify(execFile)
// Mobile is wider than the 390px frame: headless Chrome on Windows keeps windows at least ~500px
// wide and crops a narrower screenshot, which cuts the frame. 520px shows it whole, centred.
export const SIZES = { desktop: [1280, 900], mobile: [520, 932] }

/** The browser to use: MOCK_KIT_BROWSER, then the usual install paths. Null when none is found. */
export function findBrowser({ env = process.env, platform = process.platform, exists = existsSync } = {}) {
    if (env.MOCK_KIT_BROWSER) return env.MOCK_KIT_BROWSER
    const candidates = []
    if (platform === "win32") {
        const roots = [env.ProgramFiles, env["ProgramFiles(x86)"], env.LOCALAPPDATA].filter(Boolean)
        for (const base of roots) candidates.push(win32.join(base, "Google", "Chrome", "Application", "chrome.exe"))
        for (const base of roots) candidates.push(win32.join(base, "Microsoft", "Edge", "Application", "msedge.exe"))
    } else if (platform === "darwin") {
        candidates.push(
            "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
            "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
            "/Applications/Chromium.app/Contents/MacOS/Chromium",
        )
    } else {
        candidates.push("/usr/bin/google-chrome", "/usr/bin/google-chrome-stable", "/usr/bin/chromium", "/usr/bin/chromium-browser", "/snap/bin/chromium", "/usr/bin/microsoft-edge")
    }
    return candidates.find((path) => exists(path)) ?? null
}

/** One shot per variant and device. */
export function shotPlan({ slug, variants = ["A"], devices = ["desktop", "mobile"] }) {
    return variants.flatMap((variant) => devices.map((device) => ({
        variant,
        device,
        file: `${slug}-${variant}-${device}.png`,
        query: `?variant=${encodeURIComponent(variant)}&device=${device}&shot=1`,
        size: SIZES[device],
    })))
}

export function browserArgs({ url, file, size, profileDir }) {
    return [
        "--headless=new",
        "--disable-gpu",
        "--hide-scrollbars",
        "--no-first-run",
        "--no-default-browser-check",
        "--force-device-scale-factor=1",
        `--window-size=${size[0]},${size[1]}`,
        "--virtual-time-budget=8000",
        `--user-data-dir=${profileDir}`,
        `--screenshot=${file}`,
        url,
    ]
}

/** Serves the mocks folder on a free port and captures every shot of one mock. Returns the PNG paths. */
export async function takeShots({ root, dir, slug, browser = findBrowser() }) {
    if (!browser) throw new Error("No Chrome, Edge or Chromium found: set MOCK_KIT_BROWSER or pass --browser <path>")
    const base = join(root, dir)
    const registry = JSON.parse(readFileSync(join(base, "mocks.json"), "utf8"))
    const mock = registry.mocks.find((entry) => entry.file === `${slug}.html`)
    if (!mock) throw new Error(`Mock ${slug}.html not found in mocks.json`)
    const outDir = join(base, "_shots")
    mkdirSync(outDir, { recursive: true })
    const profileDir = mkdtempSync(join(tmpdir(), "mock-kit-browser-"))
    const { server, url } = await startServer({ root: base, port: 0 })
    const files = []
    try {
        for (const shot of shotPlan({ slug, variants: mock.variants ?? ["A"] })) {
            const file = join(outDir, shot.file)
            rmSync(file, { force: true })
            await run(browser, browserArgs({ url: `${url}${mock.file}${shot.query}`, file, size: shot.size, profileDir }), { timeout: 90000 })
            if (!existsSync(file)) throw new Error(`The browser did not write ${file}`)
            files.push(file)
        }
    } finally {
        server.close()
        rmSync(profileDir, { recursive: true, force: true })
    }
    return files
}
