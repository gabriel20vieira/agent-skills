// Options of a mock, without Vue, so the logic is testable in Node. Used by kit.js.
//
// An option is an independent on/off choice of one variant. Each variant keeps its own state,
// even when two variants have an option with the same name.
//   { id, label, default, where: ["Page", "Section", "Element"], go(state, mock) }
// where says where the option acts; go, when given, takes the mock there.

/** "Page > Section › Element" or ["Page", "Section"] -> ["Page", "Section", "Element"]. */
export function whereParts(where) {
    const parts = Array.isArray(where) ? where : String(where ?? "").split(/[>›]/)
    return parts.map((part) => String(part).trim()).filter(Boolean)
}

/** Options of one variant; plain strings are on by default and have no where. */
export function normaliseOptions(list = []) {
    return list.map((item) => {
        const option = typeof item === "string" ? { id: item } : item
        return { label: option.id, default: true, ...option, where: whereParts(option.where) }
    })
}

/** { variant: { id: on } }. forced (a Set, from ?options=) turns exactly those on everywhere. */
export function initialEnabled(optionsOf, forced = null) {
    return Object.fromEntries(Object.entries(optionsOf).map(([variant, options]) => [
        variant,
        Object.fromEntries(options.map((option) => [option.id, forced ? forced.has(option.id) : Boolean(option.default)])),
    ]))
}

/** The ids on for a variant, in their declared order. */
export function chosenOptions(optionsOf, enabled, variant) {
    return (optionsOf[variant] ?? []).filter((option) => enabled[variant]?.[option.id]).map((option) => option.id)
}

/** Applies a recorded choice ({ variant, options }) to that variant only. */
export function applyChoice(enabled, optionsOf, choice) {
    for (const option of optionsOf[choice.variant] ?? []) enabled[choice.variant][option.id] = choice.options.includes(option.id)
}
