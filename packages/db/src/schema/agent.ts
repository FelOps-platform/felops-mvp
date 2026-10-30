import { sql } from 'drizzle-orm'
import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'
import { workspace } from './workspace'

export type AgentInstructions = {
  role: string
  language: string
  constraints: string
  responseFormat: string
}

export const agent = pgTable(
  'agent',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspace.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    status: text('status').notNull().default('draft'),
    instructions: jsonb('instructions')
      .$type<AgentInstructions>()
      .notNull()
      .default({ role: '', language: 'auto', constraints: '', responseFormat: '' }),
    greeting: text('greeting').notNull().default(''),
    language: text('language').notNull().default('auto'),
    publicKey: text('public_key').notNull().unique(),
    allowedOrigins: text('allowed_origins')
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    theme: jsonb('theme')
      .$type<Record<string, string>>()
      .notNull()
      .default({ accent: '#FA6400' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('agent_workspace_slug_idx').on(table.workspaceId, table.slug),
    index('agent_workspace_idx').on(table.workspaceId),
  ],
)

export type Agent = typeof agent.$inferSelect
export type AgentStatus = 'draft' | 'active' | 'paused'
