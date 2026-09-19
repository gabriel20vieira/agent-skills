import { foreignKey, index, int, json, mediumtext, mysqlTable, timestamp, varchar } from "drizzle-orm/mysql-core"
import type { AssistantProposal, ProposalState } from "#shared/utils/assistant"
import { users } from "./users"

// Foreign keys are named by hand: the generated names exceed MySQL's 64-character limit.

export const assistantConversations = mysqlTable("assistant_conversations", {
    id: int("id").autoincrement().primaryKey(),
    userId: int("user_id").notNull(),
    title: varchar("title", { length: 200 }).notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
}, table => [
    index("assistant_conversations_user_idx").on(table.userId, table.updatedAt),
    foreignKey({ name: "assistant_conversations_user_fk", columns: [table.userId], foreignColumns: [users.id] }).onDelete("cascade"),
])

/** The model-facing transcript: user, assistant (with tool calls), tool results, system notes. */
export const assistantMessages = mysqlTable("assistant_messages", {
    id: int("id").autoincrement().primaryKey(),
    conversationId: int("conversation_id").notNull(),
    role: varchar("role", { length: 16 }).$type<"user" | "assistant" | "tool" | "system">().notNull(),
    content: mediumtext("content").notNull(),
    toolCalls: json("tool_calls").$type<{ id: string, name: string, arguments: Record<string, unknown> }[]>(),
    toolCallId: varchar("tool_call_id", { length: 64 }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
}, table => [
    index("assistant_messages_conversation_idx").on(table.conversationId, table.id),
    foreignKey({ name: "assistant_messages_conversation_fk", columns: [table.conversationId], foreignColumns: [assistantConversations.id] }).onDelete("cascade"),
])

export const assistantProposals = mysqlTable("assistant_proposals", {
    id: int("id").autoincrement().primaryKey(),
    conversationId: int("conversation_id").notNull(),
    userId: int("user_id").notNull(),
    tool: varchar("tool", { length: 64 }).notNull(),
    args: json("args").$type<Record<string, unknown>>().notNull(),
    summary: varchar("summary", { length: 500 }).notNull(),
    request: json("request").$type<AssistantProposal["request"]>().notNull(),
    state: varchar("state", { length: 16 }).$type<ProposalState>().notNull().default("pending"),
    resultId: varchar("result_id", { length: 64 }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
}, table => [
    index("assistant_proposals_conversation_idx").on(table.conversationId),
    foreignKey({ name: "assistant_proposals_conversation_fk", columns: [table.conversationId], foreignColumns: [assistantConversations.id] }).onDelete("cascade"),
    foreignKey({ name: "assistant_proposals_user_fk", columns: [table.userId], foreignColumns: [users.id] }).onDelete("cascade"),
])
