// node --test skills/web-new-project/scripts/new-project.test.mjs
import assert from "node:assert/strict"
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { after, test } from "node:test"
import { createProject, fillEnv, setupCode, validateOptions } from "./new-project.mjs"

const root = mkdtempSync(join(tmpdir(), "new-project-"))
after(() => rmSync(root, { recursive: true, force: true }))

test("validateOptions derives name and title from the folder", () => {
    const options = validateOptions({ dest: join(root, "my-site") })
    assert.equal(options.name, "my-site")
    assert.equal(options.title, "My Site")
    assert.throws(() => validateOptions({ dest: root, name: "My Site" }), /kebab-case/)
    assert.throws(() => validateOptions({ dest: root, name: "ok-name", locale: "fr-FR" }), /locale/)
})

test("setupCode has three groups of five unambiguous characters", () => {
    assert.match(setupCode(), /^[2-9A-HJKMNP-Z]{5}-[2-9A-HJKMNP-Z]{5}-[2-9A-HJKMNP-Z]{5}$/)
})

test("fillEnv fills secrets and keeps DATABASE_URL in sync with MYSQL_PASSWORD", () => {
    const example = "COMPOSE_PROJECT_NAME=x\nMYSQL_PASSWORD=change-me\nDATABASE_URL=mysql://app:change-me@127.0.0.1:3306/app\nNUXT_SESSION_PASSWORD=\nNUXT_SETUP_CODE=\nNUXT_PUBLIC_APP_NAME=x\n"
    const { env } = fillEnv(example, { name: "shop", title: "Shop" })
    const password = env.match(/^MYSQL_PASSWORD="(.+)"$/m)[1]
    assert.ok(password.length >= 24)
    assert.ok(env.includes(`DATABASE_URL=mysql://app:${password}@127.0.0.1:3306/app`))
    assert.match(env, /^NUXT_SESSION_PASSWORD=".{40,}"$/m)
    assert.match(env, /^COMPOSE_PROJECT_NAME="shop"$/m)
})

test("createProject copies the template, renames it and writes .env", () => {
    const dest = join(root, "parish-site")
    const result = createProject({ dest, title: "Parish Site", locale: "en-US" })

    assert.equal(result.name, "parish-site")
    assert.ok(!existsSync(join(dest, "node_modules")))
    assert.ok(!existsSync(join(dest, ".output")))
    assert.equal(JSON.parse(readFileSync(join(dest, "package.json"), "utf8")).name, "parish-site")
    assert.match(readFileSync(join(dest, "nuxt.config.ts"), "utf8"), /appName: "Parish Site"/)
    assert.match(readFileSync(join(dest, "nuxt.config.ts"), "utf8"), /defaultLocale: "en-US"/)
    assert.ok(existsSync(join(dest, "deploy", "parish-site.service")))
    const env = readFileSync(join(dest, ".env"), "utf8")
    assert.ok(env.includes(`NUXT_SETUP_CODE="${result.setupCode}"`))
    assert.ok(!env.includes("change-me"))
})

test("createProject refuses a non-empty destination", () => {
    const dest = join(root, "taken")
    createProject({ dest: join(root, "taken") })
    writeFileSync(join(dest, "extra.txt"), "x")
    assert.throws(() => createProject({ dest }), /not empty/)
})
