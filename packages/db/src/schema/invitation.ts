import { index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { workspace } from './workspace'

export const invitation = pgTable(
  'invitation',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspace.id, { onDelete: 'cascade' }),
    email: text('email').notNull(),
    role: text('role').notNull().default('member'),
    token: text('token').notNull().unique(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    acceptedAt: timestamp('accepted_at', { withTimezone: true }),
    invitedBy: text('invited_by').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('invitation_workspace_idx').on(table.workspaceId)],
)

export type Invitation = typeof invitation.$inferSelect
