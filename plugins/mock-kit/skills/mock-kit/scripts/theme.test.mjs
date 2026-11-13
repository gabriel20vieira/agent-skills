// node --test plugins/mock-kit/skills/mock-kit/scripts/theme.test.mjs
import assert from "node:assert/strict"
import { test } from "node:test"
import { DEFAULT_TOKENS, renderThemeCss, themeBlock, tokensFromCss, tokensFromJson } from "./theme.mjs"

const css = `
/* comment with :root { --nope: 1 } */
:root {
    --background: oklch(1 0 0);
    --primary: #2563eb;
    --radius: 0.625rem;
    --font-sans: "Inter", sans-serif;
}
.dark {
    --background: oklch(0.1 0 0);
}
@media (prefers-color-scheme: dark) {
    :root { --primary: #000; }
}
@layer base {
    :root, :host { --muted: 222.2 84% 4.9%; }
}
@theme inline {
    --color-brand: var(--primary);
}
`

test("tokensFromCss reads :root, :root/:host and @theme, and skips dark blocks", () => {
    assert.deepEqual(tokensFromCss(css), {
        "background": "oklch(1 0 0)",
        "primary": "#2563eb",
        "radius": "0.625rem",
        "font-sans": "\"Inter\", sans-serif",
        "muted": "222.2 84% 4.9%",
        "color-brand": "var(--primary)",
    })
})

test("tokensFromCss keeps the :root value when @theme only points a token at itself", () => {
    const tokens = tokensFromCss(":root { --spacing: 0.25rem; --font-sans: Inter; }\n@theme inline { --spacing: var(--spacing); --font-sans: var(--font-sans); --color-primary: var(--primary); }")
    assert.equal(tokens.spacing, "0.25rem")
    assert.equal(tokens["font-sans"], "Inter")
    assert.equal(tokens["color-primary"], "var(--primary)")
})

test("tokensFromJson flattens nested design tokens and $value leaves", () => {
    const json = {
        color: { primary: { $value: "#2563eb", $type: "color" }, surface: { value: "#fff" } },
        radius: { md: "8px" },
        font: { sans: { $value: "Inter" } },
        $description: "ignored",
    }
    assert.deepEqual(tokensFromJson(json), {
        "color-primary": "#2563eb",
        "color-surface": "#fff",
        "radius-md": "8px",
        "font-sans": "Inter",
    })
})

test("themeBlock maps colours, the shadcn radius scale and namespaced tokens", () => {
    const block = themeBlock(tokensFromCss(css))
    assert.ok(block.startsWith("@theme inline {\n"))
    assert.match(block, /--color-background: oklch\(1 0 0\);/)
    assert.match(block, /--color-primary: #2563eb;/)
    assert.match(block, /--color-muted: hsl\(222\.2 84% 4\.9%\);/)
    assert.match(block, /--color-brand: var\(--primary\);/)
    assert.match(block, /--radius-lg: var\(--radius\);/)
    assert.match(block, /--radius-sm: calc\(var\(--radius\) - 4px\);/)
    assert.match(block, /--font-sans: "Inter", sans-serif;/)
    assert.doesNotMatch(block, /--color-radius/)
})

test("themeBlock never writes a token that points at itself", () => {
    assert.doesNotMatch(themeBlock({ "color-primary": "var(--color-primary)" }), /--color-primary/)
})

test("renderThemeCss keeps the tokens and forces a white, light page", () => {
    const out = renderThemeCss({ primary: "#2563eb" }, "app/assets/css/main.css")
    assert.match(out, /from app\/assets\/css\/main\.css/)
    assert.match(out, /:root \{\n {4}--primary: #2563eb;\n\}/)
    assert.match(out, /background: #fff/)
    assert.match(out, /color-scheme: light/)
})

test("default tokens give the shell what it needs", () => {
    for (const name of ["background", "foreground", "primary", "primary-foreground", "muted-foreground", "border", "card", "radius"]) assert.ok(DEFAULT_TOKENS[name], name)
})
