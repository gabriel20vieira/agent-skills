import { describe, expect, it } from "vitest"
import en from "../../i18n/locales/en-US.json"
import pt from "../../i18n/locales/pt-PT.json"

type Tree = { [key: string]: string | Tree }

function keys(tree: Tree, prefix = ""): string[] {
    return Object.entries(tree).flatMap(([key, value]) =>
        typeof value === "string" ? [`${prefix}${key}`] : keys(value, `${prefix}${key}.`),
    )
}

describe("locales", () => {
    it("pt-PT and en-US have the same keys", () => {
        expect(keys(en as Tree).sort()).toEqual(keys(pt as Tree).sort())
    })
    it("defines the error codes the client falls back to", () => {
        const all = keys(pt as Tree)
        expect(all).toContain("errors.unknown")
        expect(all).toContain("network.unreachable")
    })
})
