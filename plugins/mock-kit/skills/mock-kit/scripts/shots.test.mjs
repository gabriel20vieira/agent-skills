// node --test plugins/mock-kit/skills/mock-kit/scripts/shots.test.mjs
import assert from "node:assert/strict"
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { after, test } from "node:test"
import { browserArgs, findBrowser, shotPlan, takeShots } from "./shots.mjs"

const base = mkdtempSync(join(tmpdir(), "mock-kit-shots-"))
after(() => rmSync(base, { recursive: true, force: true }))

test("findBrowser prefers MOCK_KIT_BROWSER, then known paths, else null", () => {
    const exists = (path) => path === "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe"
    assert.equal(findBrowser({ env: { MOCK_KIT_BROWSER: "/custom/chrome" }, platform: "win32", exists: () => true }), "/custom/chrome")
    assert.equal(findBrowser({ env: { ProgramFiles: "C:\\Program Files", "ProgramFiles(x86)": "C:\\Program Files (x86)" }, platform: "win32", exists }), "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe")
    assert.equal(findBrowser({ env: {}, platform: "darwin", exists: (path) => path.includes("Google Chrome.app") }), "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome")
    assert.equal(findBrowser({ env: {}, platform: "linux", exists: () => false }), null)
})

test("shotPlan takes every variant on desktop, tablet and mobile", () => {
    assert.deepEqual(shotPlan({ slug: "checkout", variants: ["A", "B"] }).map((shot) => [shot.file, shot.query, shot.size]), [
        ["checkout-A-desktop.png", "?variant=A&device=desktop&shot=1", [1280, 900]],
        ["checkout-A-tablet.png", "?variant=A&device=tablet&shot=1", [860, 1180]],
        ["checkout-A-mobile.png", "?variant=A&device=mobile&shot=1", [520, 932]],
        ["checkout-B-desktop.png", "?variant=B&device=desktop&shot=1", [1280, 900]],
        ["checkout-B-tablet.png", "?variant=B&device=tablet&shot=1", [860, 1180]],
        ["checkout-B-mobile.png", "?variant=B&device=mobile&shot=1", [520, 932]],
    ])
})

test("shotPlan with options puts them in the URL and the file name", () => {
    const [first] = shotPlan({ slug: "checkout", variants: ["A"], options: ["Gift wrap", "Express"] })
    assert.equal(first.file, "checkout-A-gift-wrap+express-desktop.png")
    assert.equal(first.query, "?variant=A&device=desktop&shot=1&options=Gift%20wrap%2CExpress")
    assert.equal(shotPlan({ slug: "checkout", variants: ["A"], options: [] })[0].query, "?variant=A&device=desktop&shot=1&options=")
    assert.equal(shotPlan({ slug: "checkout", variants: ["A"], options: [] })[0].file, "checkout-A-no-options-desktop.png", "no options must not overwrite the default shots")
})

test("browserArgs runs headless with a window size, a time budget and its own profile", () => {
    const args = browserArgs({ url: "http://127.0.0.1:1/x.html", file: "/out/x.png", size: [390, 844], profileDir: "/tmp/p" })
    assert.ok(args.includes("--headless=new"))
    assert.ok(args.includes("--window-size=390,844"))
    assert.ok(args.includes("--screenshot=/out/x.png"))
    assert.ok(args.some((arg) => arg.startsWith("--virtual-time-budget=")))
    assert.ok(args.includes("--user-data-dir=/tmp/p"))
    assert.equal(args.at(-1), "http://127.0.0.1:1/x.html")
})

const browser = findBrowser()
test("takeShots writes PNG files with a real browser", { skip: browser ? false : "no Chrome, Edge or Chromium found" }, async () => {
    const root = join(base, "project")
    const dir = "docs/mocks"
    mkdirSync(join(root, dir), { recursive: true })
    writeFileSync(join(root, dir, "plain.html"), "<!doctype html><html><body style=\"background:#fff\"><h1>Plain</h1></body></html>")
    writeFileSync(join(root, dir, "mocks.json"), JSON.stringify({ lang: "en-US", mocks: [{ file: "plain.html", title: "Plain", status: "proposta", variants: ["A"] }] }))
    const files = await takeShots({ root, dir, slug: "plain", browser })
    assert.equal(files.length, 3)
    for (const file of files) assert.deepEqual([...readFileSync(file).subarray(0, 4)], [0x89, 0x50, 0x4e, 0x47])
})
