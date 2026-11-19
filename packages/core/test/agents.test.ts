import { beforeEach, expect, it } from 'vitest'
import { resetDb } from '@felops/db/test/helpers'
import { createAgent, activateAgent, updateAgent, deleteAgent } from '../src/agents/service'
import { findAgent } from '@felops/db/repositories/agents'
import { createWorkspaceFixture } from '@felops/db/test/fixtures'
import { insertReadySource } from './fixtures'
import { NoReadyKnowledgeError, AgentNotFoundError } from '../src/agents/types'

const instructions = {
  role: 'Help customers',
  language: 'ar+en',
  constraints: '',
  responseFormat: '',
}

beforeEach(resetDb)

it('creates a draft agent with a unique slug', async () => {
  const ws = await createWorkspaceFixture('alpha')
  const a = await createAgent({
    workspaceId: ws.id,
    name: 'Support',
    greeting: 'Hello',
    instructions,
  })
  const b = await createAgent({
    workspaceId: ws.id,
    name: 'Support',
    greeting: 'Hello',
    instructions,
  })
  expect(a.status).toBe('draft')
  expect(a.slug).toBe('support')
  expect(b.slug).toBe('support-2')
  expect(a.publicKey).toMatch(/^pk_/)
})

it('refuses activation without a ready knowledge source', async () => {
  const ws = await createWorkspaceFixture('alpha')
  const a = await createAgent({
    workspaceId: ws.id,
    name: 'Support',
    greeting: 'Hello',
    instructions,
  })
  await expect(activateAgent({ workspaceId: ws.id, agentId: a.id })).rejects.toBeInstanceOf(
    NoReadyKnowledgeError,
  )
})

it('refuses activation when the only ready source has no chunks', async () => {
  const ws = await createWorkspaceFixture('alpha')
  const a = await createAgent({
    workspaceId: ws.id,
    name: 'Support',
    greeting: 'Hello',
    instructions,
  })
  await insertReadySource({ workspaceId: ws.id, agentId: a.id, chunkCount: 0 })
  await expect(activateAgent({ workspaceId: ws.id, agentId: a.id })).rejects.toBeInstanceOf(
    NoReadyKnowledgeError,
  )
})

it('activates once a ready source has chunks', async () => {
  const ws = await createWorkspaceFixture('alpha')
  const a = await createAgent({
    workspaceId: ws.id,
    name: 'Support',
    greeting: 'Hello',
    instructions,
  })
  await insertReadySource({ workspaceId: ws.id, agentId: a.id, chunkCount: 2 })
  const active = await activateAgent({ workspaceId: ws.id, agentId: a.id })
  expect(active.status).toBe('active')
})

it('deletes an agent and its sources', async () => {
  const ws = await createWorkspaceFixture('alpha')
  const a = await createAgent({
    workspaceId: ws.id,
    name: 'Support',
    greeting: 'Hello',
    instructions,
  })
  await insertReadySource({ workspaceId: ws.id, agentId: a.id, chunkCount: 2 })
  await deleteAgent({ workspaceId: ws.id, agentId: a.id })
  await expect(findAgent({ workspaceId: ws.id, agentId: a.id })).resolves.toBeNull()
})

it('does not update an agent from another workspace', async () => {
  const a = await createWorkspaceFixture('alpha')
  const b = await createWorkspaceFixture('beta')
  const created = await createAgent({
    workspaceId: a.id,
    name: 'Support',
    greeting: 'Hello',
    instructions,
  })
  await expect(
    updateAgent({ workspaceId: b.id, agentId: created.id, patch: { name: 'Hijacked' } }),
  ).rejects.toBeInstanceOf(AgentNotFoundError)
})

it('updates allowed fields and rejects an unknown agent', async () => {
  const ws = await createWorkspaceFixture('alpha')
  const created = await createAgent({
    workspaceId: ws.id,
    name: 'Support',
    greeting: 'Hello',
    instructions,
  })
  const updated = await updateAgent({
    workspaceId: ws.id,
    agentId: created.id,
    patch: { name: 'Helpdesk', greeting: 'أهلاً' },
  })
  expect(updated.name).toBe('Helpdesk')
  expect(updated.greeting).toBe('أهلاً')
  await expect(
    updateAgent({
      workspaceId: ws.id,
      agentId: '00000000-0000-0000-0000-000000000000',
      patch: { name: 'x' },
    }),
  ).rejects.toBeInstanceOf(AgentNotFoundError)
})
