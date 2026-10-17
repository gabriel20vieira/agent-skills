import { describe, expect, it } from "vitest"
import { toAnthropic } from "../../server/assistant/providers/anthropicMessages"
import { parseOllamaLine, toOllama } from "../../server/assistant/providers/ollamaStream"
import type { ChatMessage } from "../../server/assistant/provider"

describe("toAnthropic", () => {
    it("lifts leading system messages and turns later ones into user notes", () => {
        const { system, messages } = toAnthropic([
            { role: "system", content: "Base" },
            { role: "user", content: "Hi" },
            { role: "assistant", content: "Hello" },
            { role: "system", content: "The user accepted proposal 3." },
            { role: "user", content: "Thanks" },
        ])
        expect(system).toBe("Base")
        expect(messages).toEqual([
            { role: "user", content: [{ type: "text", text: "Hi" }] },
            { role: "assistant", content: [{ type: "text", text: "Hello" }] },
            { role: "user", content: [{ type: "text", text: "Note from the app: The user accepted proposal 3." }, { type: "text", text: "Thanks" }] },
        ])
    })

    it("pairs tool results by id, closes unanswered calls and drops stray results", () => {
        const history: ChatMessage[] = [
            { role: "tool", content: "{\"orphan\":true}", toolCallId: "gone" },
            { role: "user", content: "List" },
            { role: "assistant", content: "", toolCalls: [{ id: "a", name: "list_notes", arguments: {} }, { id: "b", name: "list_notes", arguments: {} }] },
            { role: "tool", content: "[]", toolCallId: "a" },
            { role: "user", content: "Next" },
        ]
        const { messages } = toAnthropic(history)
        expect(messages).toEqual([
            { role: "user", content: [{ type: "text", text: "List" }] },
            {
                role: "assistant",
                content: [
                    { type: "tool_use", id: "a", name: "list_notes", input: {} },
                    { type: "tool_use", id: "b", name: "list_notes", input: {} },
                ],
            },
            {
                role: "user",
                content: [
                    { type: "tool_result", tool_use_id: "a", content: "[]" },
                    { type: "tool_result", tool_use_id: "b", content: "Interrupted.", is_error: true },
                    { type: "text", text: "Next" },
                ],
            },
        ])
    })

    it("replays this request's raw blocks untouched and replaces invalid tool ids", () => {
        const raw = [{ type: "thinking", thinking: "", signature: "sig" }, { type: "tool_use", id: "toolu_1", name: "list_notes", input: {} }]
        const { messages } = toAnthropic([
            { role: "user", content: "Earlier" },
            { role: "assistant", content: "", toolCalls: [{ id: "bad id!", name: "list_notes", arguments: {} }] },
            { role: "tool", content: "[]", toolCallId: "bad id!" },
            { role: "user", content: "Now" },
            { role: "assistant", content: "", toolCalls: [{ id: "toolu_1", name: "list_notes", arguments: {} }], raw },
            { role: "tool", content: "[1]", toolCallId: "toolu_1" },
        ])
        expect(messages[1]).toEqual({ role: "assistant", content: [{ type: "tool_use", id: "call_1", name: "list_notes", input: {} }] })
        expect(messages[2]).toMatchObject({ role: "user", content: [{ type: "tool_result", tool_use_id: "call_1" }, { type: "text", text: "Now" }] })
        expect(messages[3]).toEqual({ role: "assistant", content: raw })
        expect(messages[4]).toEqual({ role: "user", content: [{ type: "tool_result", tool_use_id: "toolu_1", content: "[1]" }] })
    })
})

describe("ollama stream", () => {
    it("splits a line into reasoning, text and tool calls", () => {
        const line = JSON.stringify({ message: { thinking: "hm", content: "Hi", tool_calls: [{ function: { name: "list_notes", arguments: "{\"search\":\"a\"}" } }] } })
        expect(parseOllamaLine(line, () => "id-1")).toEqual([
            { type: "thinking", text: "hm" },
            { type: "text", text: "Hi" },
            { type: "tool_calls", calls: [{ id: "id-1", name: "list_notes", arguments: { search: "a" } }] },
        ])
    })

    it("throws the error Ollama reports", () => {
        expect(() => parseOllamaLine(JSON.stringify({ error: "model not found" }), () => "x")).toThrow("model not found")
    })

    it("never sends raw provider blocks to Ollama", () => {
        expect(toOllama([{ role: "assistant", content: "x", raw: [{ type: "thinking" }] }])).toEqual([{ role: "assistant", content: "x" }])
    })
})
