import { beforeEach, expect, it } from 'vitest'
import { resetDb } from '@felops/db/test/helpers'
import { createWorkspaceFixture } from '@felops/db/test/fixtures'
import { createAgent } from '../src/agents/service'
import { addSource, deleteSource, listAgentSources, retrySource } from '../src/knowledge/service'
import { NotFoundError } from '../src/errors'

const instructions = { role: 'Help', language: 'ar', constraints: '', responseFormat: '' }

beforeEach(resetDb)

it('creates a pending source scoped to the agent', async () => {
  const ws = await createWorkspaceFixture('alpha')
  const agent = await createAgent({
    workspaceId: ws.id,
    name: 'Support',
    greeting: 'Hi',
    instructions,
  })
  const source = await addSource({
    workspaceId: ws.id,
    agentId: agent.id,
    type: 'text',
    title: 'Shipping',
    rawText: 'الشحن بياخد 3 أيام',
  })
  expect(source.status).toBe('pending')
  const rows = await listAgentSources({ workspaceId: ws.id, agentId: agent.id })
  expect(rows.map((row) => row.id)).toEqual([source.id])
})

it('refuses to add a source to an agent in another workspace', async () => {
  const a = await createWorkspaceFixture('alpha')
  const b = await createWorkspaceFixture('beta')
  const agent = await createAgent({
    workspaceId: a.id,
    name: 'Support',
    greeting: 'Hi',
    instructions,
  })
  await expect(
    addSource({
      workspaceId: b.id,
      agentId: agent.id,
      type: 'text',
      title: 'Stolen',
      rawText: 'x',
    }),
  ).rejects.toBeInstanceOf(NotFoundError)
})

it('does not delete a source from another workspace', async () => {
  const a = await createWorkspaceFixture('alpha')
  const b = await createWorkspaceFixture('beta')
  const agent = await createAgent({
    workspaceId: a.id,
    name: 'Support',
    greeting: 'Hi',
    instructions,
  })
  const source = await addSource({
    workspaceId: a.id,
    agentId: agent.id,
    type: 'text',
    title: 'Shipping',
    rawText: 'x',
  })
  await expect(deleteSource({ workspaceId: b.id, sourceId: source.id })).rejects.toBeInstanceOf(
    NotFoundError,
  )
  await deleteSource({ workspaceId: a.id, sourceId: source.id })
  expect(await listAgentSources({ workspaceId: a.id, agentId: agent.id })).toHaveLength(0)
})

it('retries a failed source by resetting it to pending', async () => {
  const ws = await createWorkspaceFixture('alpha')
  const agent = await createAgent({
    workspaceId: ws.id,
    name: 'Support',
    greeting: 'Hi',
    instructions,
  })
  const source = await addSource({
    workspaceId: ws.id,
    agentId: agent.id,
    type: 'text',
    title: 'Shipping',
    rawText: 'x',
  })
  const retried = await retrySource({ workspaceId: ws.id, sourceId: source.id })
  expect(retried.status).toBe('pending')
})
