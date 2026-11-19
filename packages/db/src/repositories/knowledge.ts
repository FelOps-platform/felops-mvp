import { and, eq } from 'drizzle-orm'
import { db } from '../client'
import { knowledgeSource } from '../schema'

export async function listSources(input: { workspaceId: string; agentId: string }) {
  return db
    .select()
    .from(knowledgeSource)
    .where(
      and(
        eq(knowledgeSource.workspaceId, input.workspaceId),
        eq(knowledgeSource.agentId, input.agentId),
      ),
    )
}

export async function findSource(input: { workspaceId: string; sourceId: string }) {
  const [row] = await db
    .select()
    .from(knowledgeSource)
    .where(
      and(
        eq(knowledgeSource.workspaceId, input.workspaceId),
        eq(knowledgeSource.id, input.sourceId),
      ),
    )
    .limit(1)
  return row ?? null
}
