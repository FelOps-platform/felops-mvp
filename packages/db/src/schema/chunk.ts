import { sql } from 'drizzle-orm'
import {
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core'
import { knowledgeSource } from './knowledge'
import { tsvector, vector } from './types'

export const knowledgeChunk = pgTable(
  'knowledge_chunk',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    workspaceId: uuid('workspace_id').notNull(),
    agentId: uuid('agent_id').notNull(),
    sourceId: uuid('source_id')
      .notNull()
      .references(() => knowledgeSource.id, { onDelete: 'cascade' }),
    content: text('content').notNull(),
    contentNormalized: text('content_normalized').notNull(),
    embedding: vector('embedding'),
    tsv: tsvector('tsv').generatedAlwaysAs(
      sql`to_tsvector('simple', content_normalized)`,
    ),
    tokenCount: integer('token_count').notNull().default(0),
    heading: text('heading'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('chunk_embedding_idx').using('hnsw', table.embedding.op('vector_cosine_ops')),
    index('chunk_tsv_idx').using('gin', table.tsv),
    index('chunk_agent_source_idx').on(table.agentId, table.sourceId),
    index('chunk_workspace_idx').on(table.workspaceId),
  ],
)

export type KnowledgeChunk = typeof knowledgeChunk.$inferSelect
