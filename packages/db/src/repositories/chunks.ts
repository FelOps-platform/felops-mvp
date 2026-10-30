import { and, eq, inArray } from 'drizzle-orm'
import { db, knowledgeChunk, knowledgeSource } from '@felops/db'
import { normalizeArabic } from '@felops/ai'

export type ChunkInput = {
  content: string
  embedding: number[]
  tokenCount: number
  heading?: string | null
}

export async function replaceSourceChunks(input: {
  workspaceId: string
  agentId: string
  sourceId: string
  chunks: ChunkInput[]
}): Promise<number> {
  return db.transaction(async (tx) => {
    const [source] = await tx
      .select({ id: knowledgeSource.id })
      .from(knowledgeSource)
      .where(
        and(
          eq(knowledgeSource.id, input.sourceId),
          eq(knowledgeSource.workspaceId, input.workspaceId),
          eq(knowledgeSource.agentId, input.agentId),
        ),
      )
      .limit(1)
    if (!source) throw new Error('Source does not belong to this workspace and agent')

    await tx
      .delete(knowledgeChunk)
      .where(
        and(
          eq(knowledgeChunk.workspaceId, input.workspaceId),
          eq(knowledgeChunk.sourceId, input.sourceId),
        ),
      )

    if (input.chunks.length > 0) {
      await tx.insert(knowledgeChunk).values(
        input.chunks.map((chunk) => ({
          workspaceId: input.workspaceId,
          agentId: input.agentId,
          sourceId: input.sourceId,
          content: chunk.content,
          contentNormalized: normalizeArabic(chunk.content),
          embedding: chunk.embedding,
          tokenCount: chunk.tokenCount,
          heading: chunk.heading ?? null,
        })),
      )
    }

    await tx
      .update(knowledgeSource)
      .set({ chunkCount: input.chunks.length, updatedAt: new Date() })
      .where(eq(knowledgeSource.id, input.sourceId))

    return input.chunks.length
  })
}

export async function deleteSourceChunks(input: { workspaceId: string; sourceId: string }) {
  await db
    .delete(knowledgeChunk)
    .where(
      and(
        eq(knowledgeChunk.workspaceId, input.workspaceId),
        eq(knowledgeChunk.sourceId, input.sourceId),
      ),
    )
}

export async function chunkCountForAgent(input: {
  workspaceId: string
  agentId: string
}): Promise<number> {
  const rows = await db
    .select({ id: knowledgeChunk.id })
    .from(knowledgeChunk)
    .where(
      and(
        eq(knowledgeChunk.workspaceId, input.workspaceId),
        eq(knowledgeChunk.agentId, input.agentId),
      ),
    )
  return rows.length
}

export async function findChunksByIds(input: { workspaceId: string; ids: string[] }) {
  if (input.ids.length === 0) return []
  return db
    .select({
      id: knowledgeChunk.id,
      sourceId: knowledgeChunk.sourceId,
      content: knowledgeChunk.content,
      heading: knowledgeChunk.heading,
      title: knowledgeSource.title,
    })
    .from(knowledgeChunk)
    .innerJoin(knowledgeSource, eq(knowledgeChunk.sourceId, knowledgeSource.id))
    .where(
      and(
        eq(knowledgeChunk.workspaceId, input.workspaceId),
        inArray(knowledgeChunk.id, input.ids),
      ),
    )
}
