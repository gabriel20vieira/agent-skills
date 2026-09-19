import { describe, expect, it } from "vitest"
import { normalizeText } from "#shared/utils/normalizeText"

describe("normalizeText", () => {
    it("lowercases and strips accents", () => {
        expect(normalizeText("Ação São João")).toBe("acao sao joao")
    })
    it("collapses and trims whitespace", () => {
        expect(normalizeText("  a   b\t c ")).toBe("a b c")
    })
    it("keeps digits and punctuation", () => {
        expect(normalizeText("Nº 12-B")).toBe("nº 12-b")
    })
})
