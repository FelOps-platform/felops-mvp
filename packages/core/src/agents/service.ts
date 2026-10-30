import { randomBytes } from 'node:crypto'
import { and, eq, gt, sql } from 'drizzle-orm'
import { agent, db, knowledgeSource } from '@felops/db'
import { AgentNotFoundError, NoReadyKnowledgeError, type AgentPatch } from './types'

export function slugify(value: string): string {
  const base = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return base || 'agent'
}

async function uniqueSlug(workspaceId: string, name: string): Promise<string> {
  const base = slugify(name)
  let candidate = base
  let suffix = 2
  for (;;) {
    const [existing] = await db
      .select({ id: agent.id })
      .from(agent)
      .where(and(eq(agent.workspaceId, workspaceId), eq(agent.slug, candidate)))
      .limit(1)
    if (!existing) return candidate
    candidate = `${base}-${suffix}`
    suffix += 1
  }
}

export function generatePublicKey(): string {
  return `pk_${randomBytes(32).toString('base64url')}`
}

export async function createAgent(input: {
  workspaceId: string
  name: string
  greeting: string
  instructions: {
    role: string
    language: string
    constraints: string
    responseFormat: string
  }
}) {
  const slug = await uniqueSlug(input.workspaceId, input.name)
  const [created] = await db
    .insert(agent)
    .values({
      workspaceId: input.workspaceId,
      name: input.name,
      slug,
      greeting: input.greeting,
      status: 'draft',
      instructions: input.instructions,
      language: input.instructions.language,
      publicKey: generatePublicKey(),
    })
    .returning()
  return created
}

export async function updateAgent(input: {
  workspaceId: string
  agentId: string
  patch: AgentPatch
}) {
  const [existing] = await db
    .select()
    .from(agent)
    .where(and(eq(agent.id, input.agentId), eq(agent.workspaceId, input.workspaceId)))
    .limit(1)
  if (!existing) throw new AgentNotFoundError()

  const [updated] = await db
    .update(agent)
    .set({
      ...(input.patch.name === undefined ? {} : { name: input.patch.name }),
      ...(input.patch.greeting === undefined ? {} : { greeting: input.patch.greeting }),
      ...(input.patch.instructions === undefined
        ? {}
        : {
            instructions: input.patch.instructions,
            language: input.patch.instructions.language,
          }),
      ...(input.patch.language === undefined ? {} : { language: input.patch.language }),
      ...(input.patch.allowedOrigins === undefined
        ? {}
        : { allowedOrigins: input.patch.allowedOrigins }),
      updatedAt: new Date(),
    })
    .where(and(eq(agent.id, input.agentId), eq(agent.workspaceId, input.workspaceId)))
    .returning()
  return updated
}

export async function activateAgent(input: { workspaceId: string; agentId: string }) {
  const [existing] = await db
    .select({ id: agent.id })
    .from(agent)
    .where(and(eq(agent.id, input.agentId), eq(agent.workspaceId, input.workspaceId)))
    .limit(1)
  if (!existing) throw new AgentNotFoundError()

  const [counts] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(knowledgeSource)
    .where(
      and(
        eq(knowledgeSource.workspaceId, input.workspaceId),
        eq(knowledgeSource.agentId, input.agentId),
        eq(knowledgeSource.status, 'ready'),
        gt(knowledgeSource.chunkCount, 0),
      ),
    )

  if (!counts || counts.count === 0) throw new NoReadyKnowledgeError()

  const [updated] = await db
    .update(agent)
    .set({ status: 'active', updatedAt: new Date() })
    .where(and(eq(agent.id, input.agentId), eq(agent.workspaceId, input.workspaceId)))
    .returning()
  return updated
}

export async function pauseAgent(input: { workspaceId: string; agentId: string }) {
  const [updated] = await db
    .update(agent)
    .set({ status: 'paused', updatedAt: new Date() })
    .where(and(eq(agent.id, input.agentId), eq(agent.workspaceId, input.workspaceId)))
    .returning()
  if (!updated) throw new AgentNotFoundError()
  return updated
}

export async function deleteAgent(input: { workspaceId: string; agentId: string }) {
  return db.transaction(async (tx) => {
    const [existing] = await tx
      .select({ id: agent.id })
      .from(agent)
      .where(and(eq(agent.id, input.agentId), eq(agent.workspaceId, input.workspaceId)))
      .limit(1)
    if (!existing) throw new AgentNotFoundError()
    await tx
      .delete(knowledgeSource)
      .where(
        and(
          eq(knowledgeSource.workspaceId, input.workspaceId),
          eq(knowledgeSource.agentId, input.agentId),
        ),
      )
    await tx
      .delete(agent)
      .where(and(eq(agent.id, input.agentId), eq(agent.workspaceId, input.workspaceId)))
  })
}
