import { beforeEach, expect, it } from 'vitest'
import { db, resetDb } from './helpers'
import { createWorkspaceFixture } from './fixtures'
import { agent } from '../src/schema'
import { findAgent, listAgents } from '../src/repositories/agents'

beforeEach(resetDb)

it('does not return an agent owned by another workspace', async () => {
  const a = await createWorkspaceFixture('alpha')
  const b = await createWorkspaceFixture('beta')
  const [created] = await db
    .insert(agent)
    .values({
      workspaceId: a.id,
      name: 'Support',
      slug: 'support',
      status: 'draft',
      publicKey: 'pk_test_alpha',
    })
    .returning()

  await expect(findAgent({ workspaceId: b.id, agentId: created.id })).resolves.toBeNull()
  await expect(findAgent({ workspaceId: a.id, agentId: created.id })).resolves.toMatchObject({
    id: created.id,
  })
})

it('lists only agents inside the workspace', async () => {
  const a = await createWorkspaceFixture('alpha')
  const b = await createWorkspaceFixture('beta')
  await db
    .insert(agent)
    .values({ workspaceId: a.id, name: 'A', slug: 'a', publicKey: 'pk_a' })
  await db
    .insert(agent)
    .values({ workspaceId: b.id, name: 'B', slug: 'b', publicKey: 'pk_b' })

  const rows = await listAgents(b.id)
  expect(rows.map((row) => row.slug)).toEqual(['b'])
})
