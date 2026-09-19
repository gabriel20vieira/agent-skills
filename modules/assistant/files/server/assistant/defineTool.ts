import type { H3Event } from "h3"
import { z } from "zod"
import type { AssistantProposal } from "#shared/utils/assistant"
import type { ToolSpec } from "./provider"

export interface ToolContext {
    event: H3Event
    user: AuthUser
    /**
     * Calls the app's own API as the signed-in user (same cookie), so the REST
     * permission checks apply to everything the assistant reads. Never query the DB here.
     */
    api: <T = unknown>(url: string, options?: { method?: string, query?: Record<string, unknown> }) => Promise<T>
}

interface BaseTool<S extends z.ZodType> {
    name: string
    /** Tells the model when to use it; be specific. */
    description: string
    parameters: S
    /** Offered to the model only when can(roles, ...permission); checked again on every call. */
    permission: [Resource, Action]
}

/** Reads data. Returns only allow-listed fields (see pickFields). */
export interface ReadTool<S extends z.ZodType = z.ZodType> extends BaseTool<S> {
    kind: "read"
    run: (ctx: ToolContext, args: z.infer<S>) => Promise<unknown>
}

/**
 * Proposes a write. The assistant never writes: it produces a card, the user accepts, the
 * browser calls `request` through the normal API, and `verify` re-reads the result.
 */
export interface ProposeTool<S extends z.ZodType = z.ZodType> extends BaseTool<S> {
    kind: "propose"
    propose: (ctx: ToolContext, args: z.infer<S>) => Promise<{ summary: string, request: AssistantProposal["request"] }>
    /** True when the database shows the proposed change happened. */
    verify: (ctx: ToolContext, args: z.infer<S>, resultId: string | number | undefined) => Promise<boolean>
}

export type AssistantTool = ReadTool | ProposeTool

export function defineAssistantTool<S extends z.ZodType>(tool: ReadTool<S> | ProposeTool<S>): AssistantTool {
    if (tool.kind === "propose" && !tool.name.startsWith("propose_")) {
        throw new Error(`Write tools must be named propose_*: ${tool.name}`)
    }
    return tool as unknown as AssistantTool
}

/** Personal data allowlist: only these fields ever reach the model. */
export function pickFields<T extends Record<string, unknown>, K extends keyof T>(rows: T[], fields: readonly K[]): Pick<T, K>[] {
    return rows.map(row => Object.fromEntries(fields.map(field => [field, row[field]])) as Pick<T, K>)
}

export function toolSpec(tool: AssistantTool): ToolSpec {
    const { $schema: _ignored, ...parameters } = z.toJSONSchema(tool.parameters) as Record<string, unknown>
    return { name: tool.name, description: tool.description, parameters }
}

// Untyped on purpose: Nitro's typed routes blow the TS stack with many API routes.
type LocalFetch = (url: string, options: { method: string, query?: Record<string, unknown>, headers: Record<string, string> }) => Promise<unknown>

export function toolContext(event: H3Event, user: AuthUser): ToolContext {
    const cookie = getRequestHeader(event, "cookie") ?? ""
    const fetcher = $fetch as unknown as LocalFetch
    return {
        event,
        user,
        api: <T>(url: string, options: { method?: string, query?: Record<string, unknown> } = {}) =>
            fetcher(url, { method: options.method ?? "GET", query: options.query, headers: { cookie } }) as Promise<T>,
    }
}
