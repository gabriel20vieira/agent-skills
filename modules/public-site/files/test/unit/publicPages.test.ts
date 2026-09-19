import { describe, expect, it } from "vitest"
import pt from "../../i18n/locales/pt-PT.json"
import { PRIVATE_PREFIXES, PUBLIC_PAGES } from "#shared/utils/publicPages"

function has(tree: unknown, key: string) {
    return key.split(".").reduce<unknown>((node, part) => (node && typeof node === "object" ? (node as Record<string, unknown>)[part] : undefined), tree) !== undefined
}

describe("public pages", () => {
    it("have unique paths and translated titles and descriptions", () => {
        expect(new Set(PUBLIC_PAGES.map(page => page.path)).size).toBe(PUBLIC_PAGES.length)
        for (const page of PUBLIC_PAGES) {
            expect(has(pt, page.titleKey), page.titleKey).toBe(true)
            expect(has(pt, page.descriptionKey), page.descriptionKey).toBe(true)
        }
    })
    it("never list a private area", () => {
        for (const page of PUBLIC_PAGES) {
            expect(PRIVATE_PREFIXES.some(prefix => page.path.startsWith(prefix)), page.path).toBe(false)
        }
    })
})
