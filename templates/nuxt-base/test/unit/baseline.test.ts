import { describe, expect, it } from "vitest"
import { decideBaseline } from "../../scripts/lib/baseline.mjs"

const baselineTables = ["settings", "users"]

describe("decideBaseline", () => {
    it("does nothing when migration history exists", () => {
        expect(decideBaseline({ tables: ["__drizzle_migrations", "settings"], historyCount: 3, baselineTables }))
            .toEqual({ action: "none", reason: "history" })
    })
    it("does nothing on an empty database", () => {
        expect(decideBaseline({ tables: [], historyCount: 0, baselineTables }))
            .toEqual({ action: "none", reason: "empty" })
    })
    it("treats an empty history table as no history", () => {
        expect(decideBaseline({ tables: ["__drizzle_migrations"], historyCount: 0, baselineTables }))
            .toEqual({ action: "none", reason: "empty" })
    })
    it("records the baseline when every baseline table exists", () => {
        expect(decideBaseline({ tables: ["settings", "users", "extra"], historyCount: 0, baselineTables }))
            .toEqual({ action: "record" })
    })
    it("refuses when tables exist but some baseline tables are missing", () => {
        expect(decideBaseline({ tables: ["settings"], historyCount: 0, baselineTables }))
            .toEqual({ action: "refuse", missing: ["users"] })
    })
})
