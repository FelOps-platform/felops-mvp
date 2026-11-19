import { beforeEach, expect, it } from 'vitest'
import { eq } from 'drizzle-orm'
import { mockEmbedding } from '@felops/ai'
import { db, resetDb } from './helpers'
import { createWorkspaceFixture } from './fixtures'
import { agent, knowledgeSource, knowledgeChunk } from '../src/schema'
import { replaceSourceChunks } from '../src/repositories/chunks'

beforeEach(resetDb)

async function fixture() {
  const ws = await createWorkspaceFixture('chunks')
  const [created] = await db
    .insert(agent)
    .values({ workspaceId: ws.id, name: 'Support', slug: 'support', publicKey: `pk_${ws.id}` })
    .returning()
  const [source] = await db
    .insert(knowledgeSource)
    .values({
      workspaceId: ws.id,
      agentId: created.id,
      type: 'text',
      title: 'Shipping',
      status: 'ready',
    })
    .returning()
  return { workspaceId: ws.id, agentId: created.id, sourceId: source.id }
}

it('replaces chunks idempotently and normalizes Arabic for lexical search', async () => {
  const { workspaceId, agentId, sourceId } = await fixture()
  const first = await replaceSourceChunks({
    workspaceId,
    agentId,
    sourceId,
    chunks: [
      {
        content: 'الشّحنُ بياخد 3 أيام',
        embedding: mockEmbedding('الشحن بياخد 3 أيام'),
        tokenCount: 8,
        heading: 'Shipping',
      },
      {
        content: 'Returns take 30 days',
        embedding: mockEmbedding('Returns take 30 days'),
        tokenCount: 5,
      },
    ],
  })
  expect(first).toBe(2)

  const second = await replaceSourceChunks({
    workspaceId,
    agentId,
    sourceId,
    chunks: [
      {
        content: 'الشحن مجاني',
        embedding: mockEmbedding('الشحن مجاني'),
        tokenCount: 3,
      },
    ],
  })
  expect(second).toBe(1)

  const rows = await db.select().from(knowledgeChunk)
  expect(rows).toHaveLength(1)
  expect(rows[0].contentNormalized).toBe('الشحن مجاني')

  const [source] = await db.select().from(knowledgeSource).where(eq(knowledgeSource.id, sourceId))
  expect(source.chunkCount).toBe(1)
})

it('refuses to write chunks for a source in another workspace', async () => {
  const { agentId, sourceId } = await fixture()
  const other = await createWorkspaceFixture('other')
  await expect(
    replaceSourceChunks({
      workspaceId: other.id,
      agentId,
      sourceId,
      chunks: [{ content: 'x', embedding: mockEmbedding('x'), tokenCount: 1 }],
    }),
  ).rejects.toThrow(/does not belong/i)
})
