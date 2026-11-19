import { randomUUID } from 'node:crypto'
import { db, knowledgeSource, membership, user } from '@felops/db'
import {
  action,
  actionRun,
  agent,
  conversation,
  workspace,
} from '@felops/db/schema'
import type { WorkspaceRole } from '@felops/db/schema'
import { replaceSourceChunks } from '@felops/db/repositories/chunks'
import { mockEmbedding } from '@felops/ai'

export async function insertReadySource(input: {
  workspaceId: string
  agentId: string
  chunkCount: number
  title?: string
  type?: 'url' | 'pdf' | 'docx' | 'txt' | 'text'
  rawText?: string
  url?: string
}) {
  const [row] = await db
    .insert(knowledgeSource)
    .values({
      workspaceId: input.workspaceId,
      agentId: input.agentId,
      type: input.type ?? 'text',
      title: input.title ?? 'Test source',
      status: 'ready',
      chunkCount: input.chunkCount,
      rawText: input.rawText ?? null,
      url: input.url ?? null,
    })
    .returning()
  return row
}

export async function seedWorkspaceWithRole(role: WorkspaceRole) {
  const userId = `user_${randomUUID()}`
  await db.insert(user).values({
    id: userId,
    name: 'Fixture User',
    email: `${userId}@example.test`,
    emailVerified: true,
  })
  const [ws] = await db
    .insert(workspace)
    .values({ name: 'Fixture', slug: `fixture-${randomUUID().slice(0, 8)}` })
    .returning()
  await db.insert(membership).values({ userId, workspaceId: ws.id, role })
  return { workspaceId: ws.id, userId, workspace: ws }
}

export async function seedGroundedAgent(input: { content?: string } = {}) {
  const userId = `user_${randomUUID()}`
  await db.insert(user).values({
    id: userId,
    name: 'Owner',
    email: `${userId}@example.test`,
    emailVerified: true,
  })

  const [ws] = await db
    .insert(workspace)
    .values({ name: 'Cairo Threads', slug: `cairo-${randomUUID().slice(0, 8)}` })
    .returning()

  const [created] = await db
    .insert(agent)
    .values({
      workspaceId: ws.id,
      name: 'Support',
      slug: 'support',
      status: 'active',
      greeting: 'أهلاً بيك في Cairo Threads',
      language: 'ar+en',
      publicKey: `pk_${randomUUID().replace(/-/g, '')}`,
      instructions: {
        role: 'Answer customer questions about shipping, returns, and store hours.',
        language: 'ar+en',
        constraints: 'Never invent policy details.',
        responseFormat: 'Short paragraphs with citations.',
      },
    })
    .returning()

  const content = input.content ?? 'الشحن بياخد 3 أيام أيام عمل وبيوصل لحد باب البيت.'
  const source = await insertReadySource({
    workspaceId: ws.id,
    agentId: created.id,
    chunkCount: 1,
    title: 'Shipping policy',
    type: 'text',
    rawText: content,
  })

  await replaceSourceChunks({
    workspaceId: ws.id,
    agentId: created.id,
    sourceId: source.id,
    chunks: [
      {
        content: `Shipping takes 3 days. الشحن بياخد كام يوم؟ ${content}`,
        embedding: mockEmbedding(`Shipping takes 3 days. الشحن بياخد كام يوم؟ ${content}`),
        tokenCount: 24,
        heading: 'Shipping',
      },
    ],
  })

  const [conv] = await db
    .insert(conversation)
    .values({
      workspaceId: ws.id,
      agentId: created.id,
      channel: 'api',
      visitorId: 'visitor_1',
      status: 'open',
    })
    .returning()

  return {
    workspaceId: ws.id,
    agentId: created.id,
    conversationId: conv.id,
    userId,
    sourceId: source.id,
    publicKey: created.publicKey,
  }
}

export async function seedPendingRun() {
  const adminId = `user_${randomUUID()}`
  const memberId = `user_${randomUUID()}`
  await db.insert(user).values([
    { id: adminId, name: 'Admin', email: `${adminId}@example.test`, emailVerified: true },
    { id: memberId, name: 'Member', email: `${memberId}@example.test`, emailVerified: true },
  ])
  const [ws] = await db
    .insert(workspace)
    .values({ name: 'Cairo Threads', slug: `refund-${randomUUID().slice(0, 8)}` })
    .returning()
  await db.insert(membership).values([
    { userId: adminId, workspaceId: ws.id, role: 'admin' },
    { userId: memberId, workspaceId: ws.id, role: 'member' },
  ])
  const [createdAgent] = await db
    .insert(agent)
    .values({
      workspaceId: ws.id,
      name: 'Support',
      slug: 'support',
      status: 'active',
      publicKey: `pk_${randomUUID().replace(/-/g, '')}`,
      instructions: { role: 'Help', language: 'ar+en', constraints: '', responseFormat: '' },
    })
    .returning()
  const [createdAction] = await db
    .insert(action)
    .values({
      workspaceId: ws.id,
      agentId: createdAgent.id,
      name: 'Request refund',
      description: 'Ask the store to refund an order',
      method: 'POST',
      urlTemplate: 'https://httpbin.org/post',
      bodyTemplate: '{"reason":"{{reason}}"}',
      parameters: {
        type: 'object',
        properties: { reason: { type: 'string' } },
        required: ['reason'],
        additionalProperties: false,
      },
      approvalRequired: true,
    })
    .returning()
  const [conv] = await db
    .insert(conversation)
    .values({
      workspaceId: ws.id,
      agentId: createdAgent.id,
      channel: 'playground',
      visitorId: 'visitor_refund',
      status: 'open',
    })
    .returning()
  const runId = randomUUID()
  await db.insert(actionRun).values({
    id: runId,
    workspaceId: ws.id,
    agentId: createdAgent.id,
    actionId: createdAction.id,
    conversationId: conv.id,
    status: 'pending',
    args: { reason: 'Damaged item' },
    idempotencyKey: runId,
  })
  const { recordAudit } = await import('../src/audit/service')
  await recordAudit({
    workspaceId: ws.id,
    actorId: 'agent',
    type: 'action_run.requested',
    targetType: 'action_run',
    targetId: runId,
    data: { actionId: createdAction.id, status: 'pending' },
  })
  return {
    workspaceId: ws.id,
    runId,
    adminId,
    memberId,
    agentId: createdAgent.id,
    actionId: createdAction.id,
    conversationId: conv.id,
  }
}
