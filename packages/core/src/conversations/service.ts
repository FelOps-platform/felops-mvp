import { and, desc, eq, inArray, lt, or } from 'drizzle-orm'
import { conversation, db, message } from '@felops/db'
import type { ConversationStatus } from '@felops/db/schema'
import { NotFoundError } from '../errors'

export type ListConversationsInput = {
  workspaceId: string
  agentId?: string
  status?: ConversationStatus
  cursor?: string
  limit?: number
}

export type ConversationPage = {
  items: (typeof conversation.$inferSelect)[]
  nextCursor: string | null
}

function encodeCursor(item: { lastMessageAt: Date; id: string }): string {
  return Buffer.from(JSON.stringify({ at: item.lastMessageAt.toISOString(), id: item.id })).toString(
    'base64url',
  )
}

function decodeCursor(cursor: string): { at: Date; id: string } | null {
  try {
    const parsed = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')) as {
      at: string
      id: string
    }
    return { at: new Date(parsed.at), id: parsed.id }
  } catch {
    return null
  }
}

export async function listConversations(input: ListConversationsInput): Promise<ConversationPage> {
  const limit = Math.min(input.limit ?? 25, 100)
  const conditions = [eq(conversation.workspaceId, input.workspaceId)]
  if (input.agentId) conditions.push(eq(conversation.agentId, input.agentId))
  if (input.status) conditions.push(eq(conversation.status, input.status))

  const cursor = input.cursor ? decodeCursor(input.cursor) : null
  if (cursor) {
    const keyset = or(
      lt(conversation.lastMessageAt, cursor.at),
      and(eq(conversation.lastMessageAt, cursor.at), lt(conversation.id, cursor.id)),
    )
    if (keyset) conditions.push(keyset)
  }

  const rows = await db
    .select()
    .from(conversation)
    .where(and(...conditions))
    .orderBy(desc(conversation.lastMessageAt), desc(conversation.id))
    .limit(limit + 1)

  const page = rows.slice(0, limit)
  return {
    items: page,
    nextCursor: rows.length > limit ? encodeCursor(page[page.length - 1]) : null,
  }
}

export async function getConversation(input: {
  workspaceId: string
  conversationId: string
}) {
  const [row] = await db
    .select()
    .from(conversation)
    .where(
      and(
        eq(conversation.id, input.conversationId),
        eq(conversation.workspaceId, input.workspaceId),
      ),
    )
    .limit(1)
  return row ?? null
}

export async function takeOver(input: {
  workspaceId: string
  conversationId: string
  userId: string
}) {
  const [row] = await db
    .update(conversation)
    .set({ status: 'human', assignedTo: input.userId })
    .where(
      and(
        eq(conversation.id, input.conversationId),
        eq(conversation.workspaceId, input.workspaceId),
      ),
    )
    .returning()
  if (!row) throw new NotFoundError('Conversation not found')
  return row
}

export async function closeConversation(input: { workspaceId: string; conversationId: string }) {
  const [row] = await db
    .update(conversation)
    .set({ status: 'closed' })
    .where(
      and(
        eq(conversation.id, input.conversationId),
        eq(conversation.workspaceId, input.workspaceId),
      ),
    )
    .returning()
  if (!row) throw new NotFoundError('Conversation not found')
  return row
}

export async function reopenConversation(input: { workspaceId: string; conversationId: string }) {
  const [row] = await db
    .update(conversation)
    .set({ status: 'open', assignedTo: null })
    .where(
      and(
        eq(conversation.id, input.conversationId),
        eq(conversation.workspaceId, input.workspaceId),
      ),
    )
    .returning()
  if (!row) throw new NotFoundError('Conversation not found')
  return row
}

export async function addHumanMessage(input: {
  workspaceId: string
  conversationId: string
  content: string
  authorId?: string
}) {
  const existing = await getConversation(input)
  if (!existing) throw new NotFoundError('Conversation not found')

  const [row] = await db
    .insert(message)
    .values({
      workspaceId: input.workspaceId,
      conversationId: input.conversationId,
      role: 'assistant',
      authorType: 'human',
      content: input.content,
    })
    .returning()
  await db
    .update(conversation)
    .set({ lastMessageAt: new Date() })
    .where(eq(conversation.id, input.conversationId))
  return row
}

export async function listMessages(input: { workspaceId: string; conversationId: string }) {
  return db
    .select()
    .from(message)
    .where(
      and(
        eq(message.workspaceId, input.workspaceId),
        eq(message.conversationId, input.conversationId),
      ),
    )
    .orderBy(message.createdAt)
}

export async function lastMessageFor(conversationIds: string[]) {
  if (conversationIds.length === 0) return new Map<string, string>()
  const rows = await db
    .select({
      conversationId: message.conversationId,
      content: message.content,
      createdAt: message.createdAt,
    })
    .from(message)
    .where(inArray(message.conversationId, conversationIds))
    .orderBy(desc(message.createdAt))
  const map = new Map<string, string>()
  for (const row of rows) {
    if (!map.has(row.conversationId)) map.set(row.conversationId, row.content)
  }
  return map
}
