import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core'

export type EncryptedHeaders = { iv: string; tag: string; ciphertext: string }

export const action = pgTable(
  'action',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    workspaceId: uuid('workspace_id').notNull(),
    agentId: uuid('agent_id').notNull(),
    name: text('name').notNull(),
    description: text('description').notNull().default(''),
    method: text('method').notNull().default('POST'),
    urlTemplate: text('url_template').notNull(),
    headersEncrypted: jsonb('headers_encrypted').$type<EncryptedHeaders | null>(),
    bodyTemplate: text('body_template'),
    parameters: jsonb('parameters').$type<Record<string, unknown>>().notNull().default({}),
    approvalRequired: boolean('approval_required').notNull().default(true),
    enabled: boolean('enabled').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('action_agent_idx').on(table.agentId)],
)

export const actionRun = pgTable(
  'action_run',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    workspaceId: uuid('workspace_id').notNull(),
    agentId: uuid('agent_id').notNull(),
    actionId: uuid('action_id')
      .notNull()
      .references(() => action.id, { onDelete: 'cascade' }),
    conversationId: uuid('conversation_id'),
    status: text('status').notNull().default('pending'),
    args: jsonb('args').$type<Record<string, unknown>>().notNull().default({}),
    request: jsonb('request').$type<Record<string, unknown> | null>(),
    response: jsonb('response').$type<Record<string, unknown> | null>(),
    error: text('error'),
    approvedBy: text('approved_by'),
    approvedAt: timestamp('approved_at', { withTimezone: true }),
    idempotencyKey: text('idempotency_key').notNull().unique(),
    attempts: integer('attempts').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    finishedAt: timestamp('finished_at', { withTimezone: true }),
  },
  (table) => [
    index('action_run_workspace_status_idx').on(table.workspaceId, table.status),
    index('action_run_conversation_idx').on(table.conversationId),
  ],
)

export type Action = typeof action.$inferSelect
export type ActionRun = typeof actionRun.$inferSelect
export type ActionRunStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'running'
  | 'succeeded'
  | 'failed'
