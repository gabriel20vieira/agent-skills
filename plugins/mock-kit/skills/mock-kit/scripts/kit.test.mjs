// node --test plugins/mock-kit/skills/mock-kit/scripts/kit.test.mjs
import assert from "node:assert/strict"
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { after, test } from "node:test"
import { addComponent, buildIndex, checkKit, getChoice, HEAD_END, HEAD_START, init, newMock, parseOptions, renderIndex, setChoice, setStatus, usedComponents } from "./kit.mjs"

const base = mkdtempSync(join(tmpdir(), "mock-kit-"))
after(() => rmSync(base, { recursive: true, force: true }))
let count = 0

function project() {
    const root = join(base, `case-${++count}`)
    mkdirSync(root, { recursive: true })
    return root
}

const dir = "docs/mocks"
const read = (root, path) => readFileSync(join(root, dir, path), "utf8")
const json = (root, path) => JSON.parse(read(root, path))

test("init creates the kit, the registries and the index, and is idempotent", () => {
    const root = project()
    const first = init({ root, dir })
    for (const path of ["index.html", "mocks.json", "_kit/kit.js", "_kit/theme.css", "_kit/versions.json", "_kit/components.json", "_kit/shell/MockBar.js", "_kit/shell/index.js"]) {
        assert.ok(existsSync(join(root, dir, path)), path)
    }
    assert.equal(first.theme, "default")
    assert.deepEqual(json(root, "mocks.json"), { lang: "pt-PT", mocks: [] })
    writeFileSync(join(root, dir, "_kit/components/Card.js"), "// mine\n")
    writeFileSync(join(root, dir, "_kit/theme.css"), ":root { --primary: red; }\n")
    const second = init({ root, dir })
    assert.equal(second.theme, "kept")
    assert.equal(read(root, "_kit/components/Card.js"), "// mine\n")
    assert.equal(read(root, "_kit/theme.css"), ":root { --primary: red; }\n")
})

test("init --update-shell refreshes kit.js and the shell, never components or versions", () => {
    const root = project()
    init({ root, dir })
    writeFileSync(join(root, dir, "_kit/kit.js"), "// old runtime\n")
    writeFileSync(join(root, dir, "_kit/shell/MockBar.js"), "// old bar\n")
    writeFileSync(join(root, dir, "_kit/versions.json"), "{\"vue\":\"pinned\"}\n")
    writeFileSync(join(root, dir, "_kit/shell/MockRules.js"), "// dropped from the shell\n")
    const result = init({ root, dir, updateShell: true })
    assert.ok(!existsSync(join(root, dir, "_kit/shell/MockRules.js")), "shell files the plugin no longer ships are removed")
    assert.deepEqual(result.removed, ["shell/MockRules.js"])
    assert.match(read(root, "_kit/kit.js"), /createMock/)
    assert.match(read(root, "_kit/shell/MockBar.js"), /MockBar/)
    assert.match(read(root, "_kit/options.js"), /initialEnabled/, "runtime modules next to kit.js are refreshed too")
    assert.equal(read(root, "_kit/versions.json"), "{\"vue\":\"pinned\"}\n")
})

test("init --from-css writes the project tokens into theme.css", () => {
    const root = project()
    mkdirSync(join(root, "app"), { recursive: true })
    writeFileSync(join(root, "app", "main.css"), ":root { --primary: #123456; }\n.dark { --primary: #000; }\n")
    const result = init({ root, dir, fromCss: "app/main.css", lang: "en-US" })
    assert.equal(result.theme, "app/main.css")
    const theme = read(root, "_kit/theme.css")
    assert.match(theme, /--primary: #123456;/)
    assert.doesNotMatch(theme, /#000/)
    assert.equal(json(root, "mocks.json").lang, "en-US")
})

test("newMock writes an interactive mock with the head block and registers it", () => {
    const root = project()
    init({ root, dir })
    newMock({ root, dir, slug: "checkout", title: "Checkout", variants: ["A", "B"], options: { A: ["Coupons", "Gift wrap"], B: ["Gift wrap", "Express"] }, decisions: ["Pay at the end", "Guest checkout"], date: "2026-11-13" })
    const html = read(root, "checkout.html")
    assert.ok(html.includes(HEAD_START) && html.includes(HEAD_END))
    assert.match(html, /<script type="importmap">/)
    assert.match(html, /@theme inline/)
    assert.match(html, /<mock-variant name="A">/)
    assert.match(html, /<mock-variant name="B">/)
    assert.doesNotMatch(html, /Guest checkout|mock-rules/, "decisions belong in the agent's text, not in the mock")
    assert.match(html, /options: \{"A":\[\{"id":"Coupons","where":"Checkout"\},\{"id":"Gift wrap","where":"Checkout"\}\],"B":\[\{"id":"Gift wrap","where":"Checkout"\},\{"id":"Express","where":"Checkout"\}\]\}/)
    assert.match(html, /<mock-option name="Coupons">/)
    assert.match(html, /@click=/)
    assert.deepEqual(json(root, "mocks.json").mocks, [{ file: "checkout.html", title: "Checkout", date: "2026-11-13", status: "proposta", decisions: ["Pay at the end", "Guest checkout"], variants: ["A", "B"], options: { A: ["Coupons", "Gift wrap"], B: ["Gift wrap", "Express"] } }])
    assert.match(read(root, "index.html"), /checkout\.html/)
})

test("parseOptions reads per-variant options and refuses unknown variants", () => {
    assert.deepEqual(parseOptions("A:X,Y;B:Y,Z", ["A", "B"]), { A: ["X", "Y"], B: ["Y", "Z"] })
    assert.deepEqual(parseOptions("", ["A"]), {})
    assert.throws(() => parseOptions("C:X", ["A", "B"]), /Unknown variant "C"/)
})

test("newMock refuses invalid slugs and never overwrites", () => {
    const root = project()
    init({ root, dir })
    for (const slug of ["Bad", "../x", "a b", ""]) assert.throws(() => newMock({ root, dir, slug, title: "x" }), /Invalid slug/, slug)
    newMock({ root, dir, slug: "one", title: "One" })
    assert.throws(() => newMock({ root, dir, slug: "one", title: "Again" }), /already exists/)
})

test("addComponent creates and registers a component, refuses bad or reserved names and overwrites", () => {
    const root = project()
    init({ root, dir })
    addComponent({ root, dir, name: "OrderList", description: "List of orders with actions" })
    const source = read(root, "_kit/components/OrderList.js")
    assert.match(source, /name: "OrderList"/)
    assert.match(source, /template: `/)
    const registry = json(root, "_kit/components.json")
    assert.deepEqual(registry.map((entry) => [entry.name, entry.file, entry.example]), [["OrderList", "components/OrderList.js", "<order-list></order-list>"]])
    for (const name of ["orderList", "Order-List", "MockThing", ""]) assert.throws(() => addComponent({ root, dir, name, description: "x" }), /Invalid component name|reserved/, name)
    assert.throws(() => addComponent({ root, dir, name: "OrderList", description: "again" }), /already exists/)
})

test("usedComponents finds PascalCase, kebab-case tags and imports", () => {
    const html = `<order-list></order-list>\n<script type="module">import StatusCard from "./_kit/components/StatusCard.js"</script>\n<OtherThing />`
    assert.deepEqual(usedComponents(html, ["OrderList", "StatusCard", "OtherThing", "Unused"]), ["OrderList", "OtherThing", "StatusCard"])
})

test("buildIndex fills usedBy, marks unused components, and check then passes", () => {
    const root = project()
    init({ root, dir })
    addComponent({ root, dir, name: "OrderList", description: "Orders" })
    addComponent({ root, dir, name: "StatusCard", description: "Status" })
    newMock({ root, dir, slug: "orders", title: "Orders" })
    const path = join(root, dir, "orders.html")
    writeFileSync(path, readFileSync(path, "utf8").replace("<mock-frame>", "<mock-frame>\n<order-list></order-list>"))
    const result = buildIndex({ root, dir })
    assert.deepEqual(result.problems, [])
    assert.deepEqual(result.warnings, ["unused component: StatusCard"])
    const registry = json(root, "_kit/components.json")
    assert.deepEqual(registry.find((entry) => entry.name === "OrderList").usedBy, ["orders.html"])
    assert.equal(registry.find((entry) => entry.name === "StatusCard").unused, true)
    const check = checkKit({ root, dir })
    assert.equal(check.ok, true, JSON.stringify(check))
})

test("a component used only inside another used component is not unused", () => {
    const root = project()
    init({ root, dir })
    addComponent({ root, dir, name: "OrderList", description: "Orders" })
    addComponent({ root, dir, name: "StatusBadge", description: "Status" })
    writeFileSync(join(root, dir, "_kit/components/OrderList.js"), "import StatusBadge from \"./StatusBadge.js\"\nexport default { template: `<status-badge></status-badge>` }\n")
    newMock({ root, dir, slug: "orders", title: "Orders" })
    const path = join(root, dir, "orders.html")
    writeFileSync(path, readFileSync(path, "utf8").replace("<mock-frame>", "<mock-frame>\n<order-list></order-list>"))
    const result = buildIndex({ root, dir })
    assert.deepEqual(result.warnings, [])
    const badge = json(root, "_kit/components.json").find((entry) => entry.name === "StatusBadge")
    assert.deepEqual(badge.usedBy, ["components/OrderList.js"])
    assert.equal(badge.unused, undefined)
})

test("checkKit reports a missing file, a duplicate name, a mock with no interaction and a stale head", () => {
    const root = project()
    init({ root, dir })
    newMock({ root, dir, slug: "a", title: "A" })
    newMock({ root, dir, slug: "b", title: "B" })
    buildIndex({ root, dir })
    rmSync(join(root, dir, "a.html"))
    const registry = json(root, "_kit/components.json")
    registry.push({ name: "Twin", file: "components/Twin.js" }, { name: "twin", file: "components/Twin.js" })
    writeFileSync(join(root, dir, "_kit/components/Twin.js"), "export default {}\n")
    writeFileSync(join(root, dir, "_kit/components.json"), JSON.stringify(registry))
    const b = join(root, dir, "b.html")
    writeFileSync(b, readFileSync(b, "utf8").replace(/@click="[^"]*"/g, "").replace("vue@", "vue@0.0.0-old+"))
    const result = checkKit({ root, dir })
    assert.equal(result.ok, false)
    assert.ok(result.problems.includes("missing mock file: a.html"), result.problems.join("\n"))
    assert.ok(result.problems.includes("duplicate component name: twin"), result.problems.join("\n"))
    assert.ok(result.problems.includes("no interaction in b.html (mocks must be interactive)"), result.problems.join("\n"))
    assert.ok(result.problems.includes("outdated head block in b.html (run index)"), result.problems.join("\n"))
})

test("getChoice falls back to the first variant with its options; setChoice records the choice", () => {
    const root = project()
    init({ root, dir })
    newMock({ root, dir, slug: "pay", title: "Pay", variants: ["A", "B"], options: { A: ["X", "Y"], B: ["Y", "Z"] } })
    assert.deepEqual(getChoice({ root, dir, slug: "pay" }), { variant: "A", options: ["X", "Y"], source: "default" })
    setChoice({ root, dir, slug: "pay", variant: "B", options: ["Z"] })
    assert.deepEqual(getChoice({ root, dir, slug: "pay" }), { variant: "B", options: ["Z"], source: "mock" })
    assert.deepEqual(json(root, "mocks.json").mocks[0].choice, { variant: "B", options: ["Z"] })
    setChoice({ root, dir, slug: "pay", variant: "A", options: [], source: "chat" })
    assert.deepEqual(getChoice({ root, dir, slug: "pay" }), { variant: "A", options: [], source: "chat" })
    assert.throws(() => setChoice({ root, dir, slug: "pay", variant: "C", options: [] }), /Unknown variant "C"/)
    assert.throws(() => setChoice({ root, dir, slug: "pay", variant: "A", options: ["Z"] }), /Unknown option "Z" for variant A/)
    assert.throws(() => setChoice({ root, dir, slug: "nope", variant: "A", options: [] }), /not found/)
})

test("renderIndex lists every mock, registered or not, with its choice", () => {
    const root = project()
    init({ root, dir })
    newMock({ root, dir, slug: "pay", title: "Pay", variants: ["A", "B"], options: { B: ["Express"] } })
    setChoice({ root, dir, slug: "pay", variant: "B", options: ["Express"] })
    writeFileSync(join(root, dir, "loose.html"), "<html><head><title>Loose one</title></head><body><button @click=\"x\">x</button></body></html>")
    const html = renderIndex({ root, dir })
    assert.match(html, /href="pay\.html"/)
    assert.match(html, /href="loose.html"/)
    assert.match(html, /Loose one/)
    assert.match(html, /B \+ Express/)
})

test("check refuses <mock-state> and warns about viewport breakpoints in a mock", () => {
    const root = project()
    init({ root, dir })
    newMock({ root, dir, slug: "flow", title: "Flow" })
    const path = join(root, dir, "flow.html")
    writeFileSync(path, readFileSync(path, "utf8").replace("<mock-frame>", "<mock-frame>\n<div class=\"grid md:grid-cols-2 @md:flex\"></div>\n<mock-state></mock-state>"))
    const result = checkKit({ root, dir })
    assert.ok(result.problems.some((line) => /mock-state in flow\.html/.test(line)), result.problems.join("\n"))
    assert.ok(result.warnings.some((line) => /viewport breakpoints in flow\.html: md:grid-cols-2$/.test(line.replace(/ \(.*$/, ""))), result.warnings.join("\n"))
})

test("check warns about an option without where (the user cannot find where it acts)", () => {
    const root = project()
    init({ root, dir })
    newMock({ root, dir, slug: "pay", title: "Pay", variants: ["A"], options: { A: ["Coupons", "Wrap"] } })
    assert.deepEqual(checkKit({ root, dir }).warnings, [])
    const path = join(root, dir, "pay.html")
    writeFileSync(path, readFileSync(path, "utf8").replace(`{"id":"Wrap","where":"Pay"}`, `"Wrap"`))
    assert.deepEqual(checkKit({ root, dir }).warnings, ["option without where in pay.html: Wrap (say where it acts: \"Page > Section\")"])
})

test("setStatus moves a mock through proposta, aprovada, implementada and arquivada", () => {
    const root = project()
    init({ root, dir })
    newMock({ root, dir, slug: "flow", title: "Flow" })
    setStatus({ root, dir, slug: "flow", status: "aprovada" })
    assert.equal(json(root, "mocks.json").mocks[0].status, "aprovada")
    setStatus({ root, dir, slug: "flow", status: "arquivada" })
    assert.equal(json(root, "mocks.json").mocks[0].status, "arquivada")
    assert.throws(() => setStatus({ root, dir, slug: "flow", status: "done" }), /Invalid status/)
    assert.throws(() => setStatus({ root, dir, slug: "nope", status: "aprovada" }), /not found/)
})

test("the index splits mocks into Ativas, Implementadas and Arquivadas tabs", () => {
    const root = project()
    init({ root, dir })
    for (const slug of ["new-one", "approved", "built", "old"]) newMock({ root, dir, slug, title: slug })
    setStatus({ root, dir, slug: "approved", status: "aprovada" })
    setStatus({ root, dir, slug: "built", status: "implementada" })
    setStatus({ root, dir, slug: "old", status: "arquivada" })
    const html = renderIndex({ root, dir })
    const tab = (name) => html.match(new RegExp(`<section[^>]*data-tab="${name}"[^>]*>([\\s\\S]*?)</section>`))?.[1] ?? ""
    const links = (name) => [...tab(name).matchAll(/href="([\w-]+)\.html"/g)].map((match) => match[1])
    assert.deepEqual(links("ativas"), ["new-one", "approved"])
    assert.deepEqual(links("implementadas"), ["built"])
    assert.deepEqual(links("arquivadas"), ["old"])
    assert.match(html, /Ativas <span[^>]*>2<\/span>/)
    assert.match(html, /Arquivadas <span[^>]*>1<\/span>/)
    assert.match(html, /<section[^>]*data-tab="arquivadas"[^>]*hidden/, "Arquivadas is not shown until its tab is chosen")
})
