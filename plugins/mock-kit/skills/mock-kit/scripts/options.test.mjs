// node --test plugins/mock-kit/skills/mock-kit/scripts/options.test.mjs
import assert from "node:assert/strict"
import { test } from "node:test"
import { applyChoice, chosenOptions, initialEnabled, normaliseOptions, whereParts } from "../assets/kit/options.js"

const go = () => {}
const optionsOf = {
    A: normaliseOptions(["X", { id: "Y", where: "Encomendas > Detalhe > Pagamento", go }]),
    B: normaliseOptions([{ id: "Y", label: "Y (B)", default: false, where: ["Encomendas", "Lista"] }, "Z"]),
}

test("normaliseOptions gives id, label, default, where as parts and go", () => {
    assert.deepEqual(optionsOf.A.map(({ id, label, default: on, where }) => ({ id, label, on, where })), [
        { id: "X", label: "X", on: true, where: [] },
        { id: "Y", label: "Y", on: true, where: ["Encomendas", "Detalhe", "Pagamento"] },
    ])
    assert.equal(optionsOf.A[1].go, go)
    assert.equal(optionsOf.B[0].label, "Y (B)")
})

test("whereParts splits on > or › and trims", () => {
    assert.deepEqual(whereParts("Página X > Y › Z "), ["Página X", "Y", "Z"])
    assert.deepEqual(whereParts(["A", " B "]), ["A", "B"])
    assert.deepEqual(whereParts(undefined), [])
})

test("each variant keeps its own on/off state, even for an option with the same name", () => {
    const enabled = initialEnabled(optionsOf)
    assert.deepEqual(enabled, { A: { X: true, Y: true }, B: { Y: false, Z: true } })
    enabled.B.Y = true
    assert.equal(enabled.A.Y, true)
    enabled.A.Y = false
    assert.equal(enabled.B.Y, true)
    assert.deepEqual(chosenOptions(optionsOf, enabled, "A"), ["X"])
    assert.deepEqual(chosenOptions(optionsOf, enabled, "B"), ["Y", "Z"])
})

test("forced options (?options=) turn exactly those on in every variant", () => {
    assert.deepEqual(initialEnabled(optionsOf, new Set(["Y"])), { A: { X: false, Y: true }, B: { Y: true, Z: false } })
})

test("applyChoice sets only the chosen variant", () => {
    const enabled = initialEnabled(optionsOf)
    applyChoice(enabled, optionsOf, { variant: "B", options: ["Y"] })
    assert.deepEqual(enabled, { A: { X: true, Y: true }, B: { Y: true, Z: false } })
})
