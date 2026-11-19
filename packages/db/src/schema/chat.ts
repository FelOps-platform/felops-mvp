import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core'

export type Citation = {
  index: number
  sourceId: string
  title: string
  snippet: string
}

export const conversation = pgTable(
  'conversation',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    workspaceId: uuid('workspace_id').notNull(),
    agentId: uuid('agent_id').notNull(),
    channel: text('channel').notNull(),
    visitorId: text('visitor_id'),
    status: text('status').notNull().default('open'),
    assignedTo: text('assigned_to'),
    lastMessageAt: timestamp('last_message_at', { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('conversation_workspace_status_idx').on(
      table.workspaceId,
      table.status,
      table.lastMessageAt,
    ),
    index('conversation_agent_idx').on(table.agentId),
  ],
)

export const message = pgTable(
  'message',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    conversationId: uuid('conversation_id')
      .notNull()
      .references(() => conversation.id, { onDelete: 'cascade' }),
    workspaceId: uuid('workspace_id').notNull(),
    role: text('role').notNull(),
    authorType: text('author_type').notNull(),
    content: text('content').notNull(),
    citations: jsonb('citations').$type<Citation[]>().notNull().default([]),
    model: text('model'),
    tokensIn: integer('tokens_in'),
    tokensOut: integer('tokens_out'),
    latencyMs: integer('latency_ms'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('message_conversation_created_idx').on(table.conversationId, table.createdAt),
    index('message_workspace_idx').on(table.workspaceId),
  ],
)

export type Conversation = typeof conversation.$inferSelect
export type Message = typeof message.$inferSelect
export type ConversationChannel = 'widget' | 'hosted' | 'api' | 'playground' | 'whatsapp'
export type ConversationStatus = 'open' | 'human' | 'closed'
export type MessageRole = 'user' | 'assistant' | 'system'
export type AuthorType = 'customer' | 'ai' | 'human' | 'system'
