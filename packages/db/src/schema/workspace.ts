import { index, pgTable, primaryKey, text, timestamp, uuid } from 'drizzle-orm/pg-core'

export const workspace = pgTable(
  'workspace',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: text('name').notNull(),
    slug: text('slug').notNull().unique(),
    plan: text('plan').notNull().default('free'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('workspace_slug_idx').on(table.slug)],
)

export const membership = pgTable(
  'membership',
  {
    userId: text('user_id').notNull(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspace.id, { onDelete: 'cascade' }),
    role: text('role').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.workspaceId] }),
    index('membership_workspace_idx').on(table.workspaceId),
    index('membership_user_idx').on(table.userId),
  ],
)

export type Workspace = typeof workspace.$inferSelect
export type Membership = typeof membership.$inferSelect
export type WorkspaceRole = 'owner' | 'admin' | 'member'
