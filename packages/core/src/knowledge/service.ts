import { and, eq } from 'drizzle-orm'
import { db, knowledgeSource } from '@felops/db'
import { findAgent } from '@felops/db/repositories/agents'
import { listSources } from '@felops/db/repositories/knowledge'
import { NotFoundError } from '../errors'
import { ingestionQueue } from '../queue'

export type AddSourceInput = {
  workspaceId: string
  agentId: string
  type: 'url' | 'pdf' | 'docx' | 'txt' | 'text'
  title: string
  url?: string
  storageKey?: string
  rawText?: string
}

export async function addSource(input: AddSourceInput) {
  const agent = await findAgent({ workspaceId: input.workspaceId, agentId: input.agentId })
  if (!agent) throw new NotFoundError('Agent not found')

  const [source] = await db
    .insert(knowledgeSource)
    .values({
      workspaceId: input.workspaceId,
      agentId: input.agentId,
      type: input.type,
      title: input.title,
      url: input.url ?? null,
      storageKey: input.storageKey ?? null,
      rawText: input.rawText ?? null,
      status: 'pending',
    })
    .returning()

  await ingestionQueue.add('process-source', { sourceId: source.id, workspaceId: input.workspaceId })
  return source
}

export async function getSource(input: { workspaceId: string; sourceId: string }) {
  const [row] = await db
    .select()
    .from(knowledgeSource)
    .where(
      and(
        eq(knowledgeSource.id, input.sourceId),
        eq(knowledgeSource.workspaceId, input.workspaceId),
      ),
    )
    .limit(1)
  return row ?? null
}

export async function listAgentSources(input: { workspaceId: string; agentId: string }) {
  return listSources(input)
}

export async function retrySource(input: { workspaceId: string; sourceId: string }) {
  const source = await getSource(input)
  if (!source) throw new NotFoundError('Source not found')
  const [updated] = await db
    .update(knowledgeSource)
    .set({ status: 'pending', error: null, updatedAt: new Date() })
    .where(and(eq(knowledgeSource.id, source.id), eq(knowledgeSource.workspaceId, input.workspaceId)))
    .returning()
  await ingestionQueue.add('process-source', {
    sourceId: updated.id,
    workspaceId: input.workspaceId,
  })
  return updated
}

export async function deleteSource(input: { workspaceId: string; sourceId: string }) {
  const source = await getSource(input)
  if (!source) throw new NotFoundError('Source not found')
  await db
    .delete(knowledgeSource)
    .where(and(eq(knowledgeSource.id, source.id), eq(knowledgeSource.workspaceId, input.workspaceId)))
}

export async function setSourceStatus(input: {
  workspaceId: string
  sourceId: string
  status: 'pending' | 'processing' | 'ready' | 'failed'
  error?: string | null
  chunkCount?: number
}) {
  await db
    .update(knowledgeSource)
    .set({
      status: input.status,
      error: input.error ? input.error.slice(0, 500) : null,
      ...(input.chunkCount === undefined ? {} : { chunkCount: input.chunkCount }),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(knowledgeSource.id, input.sourceId),
        eq(knowledgeSource.workspaceId, input.workspaceId),
      ),
    )
}

export async function countReadySources(workspaceId: string): Promise<number> {
  const rows = await db
    .select({ id: knowledgeSource.id })
    .from(knowledgeSource)
    .where(
      and(eq(knowledgeSource.workspaceId, workspaceId), eq(knowledgeSource.status, 'ready')),
    )
  return rows.length
}
