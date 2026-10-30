import { sql } from 'drizzle-orm'
import {
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core'

export const knowledgeSource = pgTable(
  'knowledge_source',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    workspaceId: uuid('workspace_id').notNull(),
    agentId: uuid('agent_id').notNull(),
    type: text('type').notNull(),
    title: text('title').notNull(),
    url: text('url'),
    storageKey: text('storage_key'),
    rawText: text('raw_text'),
    status: text('status').notNull().default('pending'),
    error: text('error'),
    chunkCount: integer('chunk_count').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('knowledge_source_agent_status_idx').on(table.agentId, table.status)],
)

export type KnowledgeSource = typeof knowledgeSource.$inferSelect
export type KnowledgeSourceType = 'url' | 'pdf' | 'docx' | 'txt' | 'text'
export type KnowledgeSourceStatus = 'pending' | 'processing' | 'ready' | 'failed'

export const KNOWLEDGE_TABLES_READY = sql`1 = 1`
