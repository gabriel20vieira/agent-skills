// Design tokens for mocks: read them from a project's CSS or a JSON tokens file, write
// _kit/theme.css, and map them to Tailwind names in an `@theme inline` block.

/** Light, neutral tokens used when the project has no theme, and to fill the gaps of one. */
export const DEFAULT_TOKENS = {
    "background": "oklch(1 0 0)",
    "foreground": "oklch(0.145 0 0)",
    "card": "oklch(1 0 0)",
    "card-foreground": "oklch(0.145 0 0)",
    "popover": "oklch(1 0 0)",
    "popover-foreground": "oklch(0.145 0 0)",
    "primary": "oklch(0.205 0 0)",
    "primary-foreground": "oklch(0.985 0 0)",
    "secondary": "oklch(0.97 0 0)",
    "secondary-foreground": "oklch(0.205 0 0)",
    "muted": "oklch(0.97 0 0)",
    "muted-foreground": "oklch(0.556 0 0)",
    "accent": "oklch(0.97 0 0)",
    "accent-foreground": "oklch(0.205 0 0)",
    "destructive": "oklch(0.577 0.245 27.325)",
    "border": "oklch(0.922 0 0)",
    "input": "oklch(0.922 0 0)",
    "ring": "oklch(0.708 0 0)",
    "radius": "0.625rem",
    "font-sans": "ui-sans-serif, system-ui, sans-serif",
}

// Tokens already named the way Tailwind's theme expects them.
const NAMESPACES = ["color-", "font-", "radius-", "shadow-", "inset-shadow-", "drop-shadow-", "text-", "spacing", "breakpoint-", "container-", "ease-", "animate-", "tracking-", "leading-", "blur-", "perspective-", "aspect-"]
const COLOR_FUNCTION = /^(rgba?|hsla?|oklch|oklab|lab|lch|hwb|color|color-mix)\(/i
const HSL_TRIPLET = /^-?\d+(\.\d+)?(deg)?\s+\d+(\.\d+)?%\s+\d+(\.\d+)?%(\s*\/\s*[\d.]+%?)?$/
const NAMED = new Set(["white", "black", "transparent", "currentcolor"])

function stripComments(css) {
    return css.replace(/\/\*[\s\S]*?\*\//g, "")
}

/** Top-level `prelude { body }` blocks of a stylesheet, braces balanced. */
function blocks(css) {
    const out = []
    let at = 0
    while (at < css.length) {
        const open = css.indexOf("{", at)
        if (open < 0) break
        const prelude = css.slice(at, open).split(";").pop().trim()
        let depth = 1
        let close = open + 1
        while (close < css.length && depth > 0) {
            if (css[close] === "{") depth += 1
            else if (css[close] === "}") depth -= 1
            close += 1
        }
        out.push({ prelude, body: css.slice(open + 1, close - 1) })
        at = close
    }
    return out
}

function declarations(body, into) {
    for (const part of body.split(";")) {
        const match = part.match(/^\s*--([\w-]+)\s*:\s*([\s\S]+?)\s*$/)
        // `--x: var(--x)` (common in @theme inline) only re-exports :root; it would make the token circular.
        if (match && match[2] !== `var(--${match[1]})`) into[match[1]] = match[2]
    }
}

function isRootSelector(prelude) {
    const selectors = prelude.split(",").map((item) => item.trim())
    return selectors.includes(":root") && selectors.every((item) => item === ":root" || item === ":host")
}

/** Custom properties of `:root` (or `:root, :host`) and `@theme` blocks, inside `@layer` too. Dark blocks and media queries are skipped. */
export function tokensFromCss(css) {
    const tokens = {}
    const visit = (text) => {
        for (const { prelude, body } of blocks(text)) {
            if (/^@layer\b/.test(prelude)) visit(body)
            else if (/^@theme\b/.test(prelude) || isRootSelector(prelude)) declarations(body, tokens)
        }
    }
    visit(stripComments(css))
    return tokens
}

/** Flattens a design-tokens JSON (plain values, or W3C/Style Dictionary `$value`/`value` leaves). */
export function tokensFromJson(json) {
    const tokens = {}
    const walk = (node, path) => {
        if (node === null || node === undefined) return
        if (typeof node !== "object") {
            if (path.length) tokens[path.join("-")] = String(node)
            return
        }
        if ("$value" in node || ("value" in node && typeof node.value !== "object")) {
            tokens[path.join("-")] = String(node.$value ?? node.value)
            return
        }
        for (const [key, value] of Object.entries(node)) {
            if (!key.startsWith("$")) walk(value, [...path, key])
        }
    }
    walk(json, [])
    return tokens
}

function colourValue(value, tokens, depth = 0) {
    const plain = value.trim()
    if (/^#[0-9a-f]{3,8}$/i.test(plain) || COLOR_FUNCTION.test(plain) || NAMED.has(plain.toLowerCase())) return plain
    if (HSL_TRIPLET.test(plain)) return `hsl(${plain})`
    const ref = plain.match(/^var\(--([\w-]+)\)$/)
    if (ref && depth < 5 && tokens[ref[1]] !== undefined) return colourValue(tokens[ref[1]], tokens, depth + 1) ? plain : null
    return null
}

/** `@theme inline { ... }` giving the tokens Tailwind names (bg-primary, rounded-lg, font-sans). */
export function themeBlock(tokens) {
    const out = new Map()
    for (const [name, value] of Object.entries(tokens)) {
        if (NAMESPACES.some((prefix) => name.startsWith(prefix))) {
            out.set(name, value)
        } else if (name === "radius") {
            out.set("radius-sm", "calc(var(--radius) - 4px)")
            out.set("radius-md", "calc(var(--radius) - 2px)")
            out.set("radius-lg", "var(--radius)")
            out.set("radius-xl", "calc(var(--radius) + 4px)")
        } else {
            const colour = colourValue(value, tokens)
            if (colour) out.set(`color-${name}`, colour)
        }
    }
    const lines = [...out].filter(([name, value]) => value.trim() !== `var(--${name})`).map(([name, value]) => `    --${name}: ${value};`)
    return `@theme inline {\n${lines.join("\n")}\n}`
}

/** The project's _kit/theme.css: its tokens on :root, and a page that is always white and light. */
export function renderThemeCss(tokens, source = "mock-kit defaults") {
    const lines = Object.entries(tokens).map(([name, value]) => `    --${name}: ${value};`)
    return [
        `/* Generated by mock-kit from ${source}. Mocks are always white and light. */`,
        `:root {\n${lines.join("\n")}\n}`,
        "",
        "html,\nbody {\n    background: #fff;\n    color-scheme: light;\n}",
        "",
    ].join("\n")
}
