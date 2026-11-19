import { beforeEach, expect, it } from 'vitest'
import { resetDb } from '@felops/db/test/helpers'
import { answer } from '../src/chat/service'
import { takeOver, closeConversation, listConversations, addHumanMessage } from '../src/conversations/service'
import { seedGroundedAgent } from './fixtures'
import { HumanControlledError } from '../src/errors'

beforeEach(resetDb)

it('stops automatic replies after a human takes over', async () => {
  const { workspaceId, agentId, conversationId, userId } = await seedGroundedAgent()
  await takeOver({ workspaceId, conversationId, userId })
  await expect(
    answer({ workspaceId, agentId, conversationId, message: 'hello again', channel: 'hosted' }),
  ).rejects.toBeInstanceOf(HumanControlledError)
})

it('does not list conversations from another workspace', async () => {
  const a = await seedGroundedAgent()
  const b = await seedGroundedAgent()
  const page = await listConversations({ workspaceId: b.workspaceId })
  expect(page.items.map((c) => c.id)).not.toContain(a.conversationId)
})

it('closes a conversation and refuses further replies', async () => {
  const { workspaceId, agentId, conversationId } = await seedGroundedAgent()
  await closeConversation({ workspaceId, conversationId })
  await expect(
    answer({ workspaceId, agentId, conversationId, message: 'anyone?', channel: 'hosted' }),
  ).rejects.toBeInstanceOf(HumanControlledError)
})

it('records a human reply in the thread', async () => {
  const { workspaceId, conversationId, userId } = await seedGroundedAgent()
  await takeOver({ workspaceId, conversationId, userId })
  const row = await addHumanMessage({
    workspaceId,
    conversationId,
    content: 'أنا من فريق الدعم، هساعدك حالاً',
  })
  expect(row.authorType).toBe('human')
  expect(row.role).toBe('assistant')
})
