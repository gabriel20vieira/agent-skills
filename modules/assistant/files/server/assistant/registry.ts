import type { AssistantTool } from "./defineTool"
import { listNotes, proposeNote } from "./tools/notes"

/** Every tool the assistant may use. Add new ones here (web-assistant-tool skill). */
export const ASSISTANT_TOOLS: AssistantTool[] = [listNotes, proposeNote]

/** The tools this user may use right now (filtered by the permission matrix). */
export function toolsFor(user: AuthUser): Map<string, AssistantTool> {
    return new Map(ASSISTANT_TOOLS
        .filter(tool => can(user.effectiveRoles, ...tool.permission))
        .map(tool => [tool.name, tool]))
}
