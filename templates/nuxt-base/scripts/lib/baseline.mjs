/**
 * Decides what a database needs before `drizzle-kit migrate` runs.
 *
 * - history: __drizzle_migrations has rows, so migrate applies what is pending.
 * - empty: no app tables, so migrate builds everything from 0000.
 * - record: tables exist with no history (created by `push`); mark 0000 as applied.
 * - refuse: tables exist but do not match 0000; a human must look.
 *
 * @param {{ tables: string[], historyCount: number, baselineTables: string[] }} input
 */
export function decideBaseline({ tables, historyCount, baselineTables }) {
    if (historyCount > 0) return { action: "none", reason: "history" }
    const appTables = tables.filter(name => name !== "__drizzle_migrations")
    if (appTables.length === 0) return { action: "none", reason: "empty" }
    const present = new Set(appTables)
    const missing = baselineTables.filter(name => !present.has(name))
    if (missing.length > 0) return { action: "refuse", missing }
    return { action: "record" }
}
