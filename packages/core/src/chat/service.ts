import { randomUUID } from 'node:crypto'
import { and, asc, desc, eq, sql } from 'drizzle-orm'
import { agent as agentTable, conversation, db, message } from '@felops/db'
import type { Citation } from '@felops/db/schema'
import {
  buildPrompt,
  estimateTokens,
  fallbackAnswer,
  streamAssistant,
  type ChatTurn,
} from '@felops/ai'
import { HumanControlledError, NotFoundError } from '../errors'
import { assertWithinQuota, recordMessage } from '../usage/service'
import { retrieve } from './retrieve'
import { maybeRequestAction } from '../actions/propose'

export type ChatChannel = 'widget' | 'hosted' | 'api' | 'playground' | 'whatsapp'

export type AnswerInput = {
  workspaceId: string
  agentId: string
  conversationId?: string
  visitorId?: string
  message: string
  channel: ChatChannel
}

export type AnswerResult = {
  stream: ReadableStream<Uint8Array>
  conversationId: string
  messageId: string
}

const encoder = new TextEncoder()

function sse(event: string, data: unknown): Uint8Array {
  return encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
}

function detectLanguage(text: string, configured?: string): 'ar' | 'en' {
  if (/[\u0600-\u06FF]/.test(text)) return 'ar'
  if (configured === 'ar') return 'ar'
  return 'en'
}

function extractiveAnswer(chunks: { content: string }[]): string {
  const first = chunks[0]?.content?.trim() ?? ''
  const cleaned = first.replace(/ignore (all )?previous instructions?[^.]*\.?/gi, '').trim()
  const sentence = cleaned.split(/(?<=[.!?])\s+/)[0] ?? cleaned
  return `${sentence.slice(0, 700)} [1]`
}

async function loadConversation(input: { workspaceId: string; agentId: string; conversationId: string }) {
  const [row] = await db
    .select()
    .from(conversation)
    .where(
      and(
        eq(conversation.id, input.conversationId),
        eq(conversation.workspaceId, input.workspaceId),
        eq(conversation.agentId, input.agentId),
      ),
    )
    .limit(1)
  return row ?? null
}

export async function answer(input: AnswerInput): Promise<AnswerResult> {
  const [agent] = await db
    .select()
    .from(agentTable)
    .where(
      and(eq(agentTable.id, input.agentId), eq(agentTable.workspaceId, input.workspaceId)),
    )
    .limit(1)
  if (!agent) throw new NotFoundError('Agent not found')

  let conversationRow = input.conversationId
    ? await loadConversation({
        workspaceId: input.workspaceId,
        agentId: input.agentId,
        conversationId: input.conversationId,
      })
    : null

  if (input.conversationId && !conversationRow) {
    throw new NotFoundError('Conversation not found')
  }
  if (conversationRow && (conversationRow.status === 'human' || conversationRow.status === 'closed')) {
    throw new HumanControlledError()
  }

  await assertWithinQuota(input.workspaceId)

  if (!conversationRow) {
    const [created] = await db
      .insert(conversation)
      .values({
        workspaceId: input.workspaceId,
        agentId: input.agentId,
        channel: input.channel,
        visitorId: input.visitorId ?? null,
        status: 'open',
        lastMessageAt: new Date(),
      })
      .returning()
    conversationRow = created
  }

  const conversationId = conversationRow.id

  const historyRows = await db
    .select({ role: message.role, content: message.content })
    .from(message)
    .where(eq(message.conversationId, conversationId))
    .orderBy(desc(message.createdAt))
    .limit(10)
  const history: ChatTurn[] = historyRows
    .reverse()
    .filter((row) => row.role === 'user' || row.role === 'assistant')
    .map((row) => ({ role: row.role as 'user' | 'assistant', content: row.content }))

  await db.insert(message).values({
    conversationId,
    workspaceId: input.workspaceId,
    role: 'user',
    authorType: 'customer',
    content: input.message,
  })
  await db
    .update(conversation)
    .set({ lastMessageAt: new Date() })
    .where(eq(conversation.id, conversationId))
  await recordMessage(input.workspaceId)

  await maybeRequestAction({
    workspaceId: input.workspaceId,
    agentId: input.agentId,
    conversationId,
    message: input.message,
  }).catch(() => null)

  const language = detectLanguage(input.message, agent.language)
  const chunks = await retrieve({
    workspaceId: input.workspaceId,
    agentId: input.agentId,
    query: input.message,
  })

  const citations: Citation[] = chunks.map((chunk, index) => ({
    index: index + 1,
    sourceId: chunk.sourceId,
    title: chunk.title,
    snippet: chunk.content.slice(0, 240),
  }))

  const messageId = randomUUID()
  const startedAt = Date.now()
  const modelName = process.env.CHAT_MODEL ?? 'gpt-4.1-mini'

  const prompt =
    chunks.length > 0
      ? buildPrompt({
          agent: {
            name: agent.name,
            greeting: agent.greeting,
            language: agent.language,
            instructions: agent.instructions,
          },
          sources: chunks.map((chunk, index) => ({
            index: index + 1,
            title: chunk.title,
            content: chunk.content,
          })),
          customerLanguage: language,
        })
      : null

  const fallbackText =
    chunks.length > 0 ? extractiveAnswer(chunks) : fallbackAnswer(language)

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let full = ''
      let finished = false
      controller.enqueue(
        sse('meta', { conversationId, messageId, citations }),
      )
      try {
        if (prompt) {
          for await (const delta of streamAssistant({
            system: prompt.system,
            messages: [...history, { role: 'user', content: input.message }],
            fallbackText,
          })) {
            if (!delta) continue
            full += delta
            controller.enqueue(sse('token', { text: delta }))
          }
        } else {
          for (const piece of fallbackText.match(/.{1,18}/gs) ?? [fallbackText]) {
            full += piece
            controller.enqueue(sse('token', { text: piece }))
          }
        }
        controller.enqueue(sse('done', { messageId, citations }))
        finished = true
      } catch {
        if (!full) {
          full = fallbackAnswer(language)
          controller.enqueue(sse('token', { text: full }))
        }
        controller.enqueue(sse('error', { message: 'The assistant could not finish.' }))
      } finally {
        if (!finished && full) {
          controller.enqueue(sse('done', { messageId, citations }))
        }
        try {
          await db.insert(message).values({
            id: messageId,
            conversationId,
            workspaceId: input.workspaceId,
            role: 'assistant',
            authorType: 'ai',
            content: full,
            citations: prompt ? citations : [],
            model: prompt ? modelName : null,
            tokensIn: prompt ? estimateTokens(prompt.system + input.message) : null,
            tokensOut: estimateTokens(full),
            latencyMs: Date.now() - startedAt,
          })
          await db
            .update(conversation)
            .set({ lastMessageAt: new Date() })
            .where(eq(conversation.id, conversationId))
        } catch {
          // Persistence must never break the response once streaming has begun.
        }
        controller.close()
      }
    },
  })

  return { stream, conversationId, messageId }
}

export async function getConversationMessages(input: {
  workspaceId: string
  conversationId: string
}) {
  return db
    .select()
    .from(message)
    .where(
      and(
        eq(message.workspaceId, input.workspaceId),
        eq(message.conversationId, input.conversationId),
      ),
    )
    .orderBy(asc(message.createdAt))
}

export async function appendSystemMessage(input: {
  workspaceId: string
  conversationId: string
  content: string
}) {
  const [row] = await db
    .insert(message)
    .values({
      workspaceId: input.workspaceId,
      conversationId: input.conversationId,
      role: 'system',
      authorType: 'system',
      content: input.content,
    })
    .returning()
  await db
    .update(conversation)
    .set({ lastMessageAt: new Date() })
    .where(eq(conversation.id, input.conversationId))
  return row
}

export async function conversationStats(input: { workspaceId: string; since: Date }) {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(conversation)
    .where(
      and(
        eq(conversation.workspaceId, input.workspaceId),
        sql`${conversation.createdAt} >= ${input.since}`,
      ),
    )
  return row?.count ?? 0
}
