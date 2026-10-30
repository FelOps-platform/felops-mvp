import { and, desc, eq } from 'drizzle-orm'
import { db } from '../client'
import { agent } from '../schema'

export async function findAgent(input: { workspaceId: string; agentId: string }) {
  const [row] = await db
    .select()
    .from(agent)
    .where(and(eq(agent.id, input.agentId), eq(agent.workspaceId, input.workspaceId)))
    .limit(1)
  return row ?? null
}

export async function findAgentBySlug(input: {
  workspaceId: string
  slug: string
}) {
  const [row] = await db
    .select()
    .from(agent)
    .where(and(eq(agent.slug, input.slug), eq(agent.workspaceId, input.workspaceId)))
    .limit(1)
  return row ?? null
}

export async function findAgentByPublicKey(publicKey: string) {
  const [row] = await db.select().from(agent).where(eq(agent.publicKey, publicKey)).limit(1)
  return row ?? null
}

export async function listAgents(workspaceId: string) {
  return db
    .select()
    .from(agent)
    .where(eq(agent.workspaceId, workspaceId))
    .orderBy(desc(agent.createdAt))
}
