// Pure helpers for the dev-crew dashboard: no DOM, no network. Tested with node --test.

export const DEFAULT_LIMITS = { opus: 2, sonnet: 4, haiku: 6 }
export const STALE_MS = 600000
export const OUTPUT_PRICE_PER_MTOK = { opus: 20, sonnet: 10, haiku: 0.5 }
export const ACTIVE = ["running", "fixing"]
export const MODELS = ["opus", "sonnet", "haiku"]

/** Limits from the `config/limits` doc, falling back to the defaults for missing or bad values. */
export function normalizeLimits(doc) {
    const limits = {}
    for (const model of MODELS) {
        const value = Number.parseInt(doc?.[model], 10)
        limits[model] = Number.isInteger(value) && value >= 0 ? value : DEFAULT_LIMITS[model]
    }
    return limits
}

/** An active agent that has not updated its row for over STALE_MS, or never did ("no signal"). */
export function isStale(agent, now) {
    if (!ACTIVE.includes(agent.status)) return false
    const updated = Date.parse(agent.updatedAt)
    return Number.isNaN(updated) || now - updated > STALE_MS
}

/** Active agents per model; the main session is outside the limits. */
export function countRunning(agents, now) {
    const counts = { opus: 0, sonnet: 0, haiku: 0 }
    for (const agent of agents) {
        if (agent.role === "main") continue
        if (ACTIVE.includes(agent.status) && !isStale(agent, now) && agent.model in counts) counts[agent.model]++
    }
    return counts
}

/** Nests agents under their parentId; agents whose parent is missing become roots. */
export function buildTree(agents) {
    const nodes = new Map(agents.map((agent) => [agent.id, { agent, children: [] }]))
    const roots = []
    for (const node of nodes.values()) {
        const parent = node.agent.parentId != null ? nodes.get(node.agent.parentId) : undefined
        if (parent) parent.children.push(node)
        else roots.push(node)
    }
    return roots
}

/** Rough USD cost: tokens arrive as one total, so every token is priced at the output rate. */
export function estimateCost(agents) {
    let total = 0
    for (const agent of agents) total += ((agent.tokens ?? 0) * (OUTPUT_PRICE_PER_MTOK[agent.model] ?? 0)) / 1e6
    return total
}
