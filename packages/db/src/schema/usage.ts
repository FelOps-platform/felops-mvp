import { integer, pgTable, primaryKey, text, uuid } from 'drizzle-orm/pg-core'

export const usageCounter = pgTable(
  'usage_counter',
  {
    workspaceId: uuid('workspace_id').notNull(),
    period: text('period').notNull(),
    messages: integer('messages').notNull().default(0),
    ingestions: integer('ingestions').notNull().default(0),
  },
  (table) => [primaryKey({ columns: [table.workspaceId, table.period] })],
)

export type UsageCounter = typeof usageCounter.$inferSelect
