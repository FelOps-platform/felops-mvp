import { beforeEach, expect, it, vi } from 'vitest'
import { and, eq } from 'drizzle-orm'
import { auditEvent, db } from '@felops/db'
import { resetDb } from '@felops/db/test/helpers'
import {
  approveActionRun,
  rejectActionRun,
  requestActionRun,
  createAction,
  getActionRun,
} from '../src/actions/service'
import { actionQueue } from '../src/queue'
import { seedPendingRun } from './fixtures'
import { InvalidTransitionError } from '../src/agents/types'
import { ForbiddenError } from '../src/errors'
import { encryptJson, decryptJson } from '../src/actions/crypto'
import { assertSafeActionUrl } from '../src/actions/ssrf'
import { buildActionRequest } from '../src/actions/executor'
import { assertTransition } from '../src/actions/state'

const actionQueueAddSpy = vi.spyOn(actionQueue, 'add').mockResolvedValue({ id: 'job-1' })

beforeEach(async () => {
  await resetDb()
  actionQueueAddSpy.mockClear()
})

it('enqueues execution only once when approval is repeated', async () => {
  const { workspaceId, runId, adminId } = await seedPendingRun()
  await approveActionRun({ workspaceId, runId, userId: adminId })
  await approveActionRun({ workspaceId, runId, userId: adminId })
  expect(actionQueueAddSpy).toHaveBeenCalledTimes(1)
  const run = await getActionRun({ workspaceId, runId })
  expect(run?.status).toBe('approved')
})

it('does not let a member approve an action', async () => {
  const { workspaceId, runId, memberId } = await seedPendingRun()
  await expect(
    approveActionRun({ workspaceId, runId, userId: memberId }),
  ).rejects.toBeInstanceOf(ForbiddenError)
  const run = await getActionRun({ workspaceId, runId })
  expect(run?.status).toBe('pending')
})

it('rejects a pending run and never enqueues execution', async () => {
  const { workspaceId, runId, adminId } = await seedPendingRun()
  const rejected = await rejectActionRun({ workspaceId, runId, userId: adminId })
  expect(rejected.status).toBe('rejected')
  await expect(
    approveActionRun({ workspaceId, runId, userId: adminId }),
  ).rejects.toBeInstanceOf(InvalidTransitionError)
  expect(actionQueueAddSpy).not.toHaveBeenCalled()
})

it('writes audit events for request and approval in the same flow', async () => {
  const { workspaceId, runId, adminId } = await seedPendingRun()
  await approveActionRun({ workspaceId, runId, userId: adminId })
  const events = await db
    .select()
    .from(auditEvent)
    .where(and(eq(auditEvent.workspaceId, workspaceId), eq(auditEvent.targetId, runId)))
  expect(events.map((event) => event.type)).toEqual(
    expect.arrayContaining(['action_run.requested', 'action_run.approved']),
  )
})

it('enqueues immediately when approval is not required', async () => {
  const { workspaceId, agentId } = await seedPendingRun()
  const act = await createAction({
    workspaceId,
    agentId,
    name: 'Check order',
    method: 'GET',
    urlTemplate: 'https://httpbin.org/get?order={{orderId}}',
    parameters: {
      type: 'object',
      properties: { orderId: { type: 'string' } },
      required: ['orderId'],
    },
    approvalRequired: false,
  })
  const run = await requestActionRun({
    workspaceId,
    agentId,
    actionId: act.id,
    args: { orderId: 'A-1' },
  })
  expect(run.status).toBe('approved')
  expect(actionQueueAddSpy).toHaveBeenCalledTimes(1)
})

it('validates action arguments against the JSON schema', async () => {
  const { workspaceId, agentId, actionId } = await seedPendingRun()
  await expect(
    requestActionRun({ workspaceId, agentId, actionId, args: {} }),
  ).rejects.toThrow(/Invalid action parameters/)
})

it('round-trips encrypted headers and redacts them from stored requests', () => {
  const payload = encryptJson({ authorization: 'Bearer secret', 'x-team': 'support' })
  expect(decryptJson<Record<string, string>>(payload)).toEqual({
    authorization: 'Bearer secret',
    'x-team': 'support',
  })
  expect(payload.ciphertext).not.toContain('Bearer secret')
})

it('blocks SSRF targets for actions', async () => {
  await expect(assertSafeActionUrl('http://169.254.169.254/latest/meta-data')).rejects.toThrow()
  await expect(assertSafeActionUrl('http://localhost:3000/admin')).rejects.toThrow()
})

it('substitutes parameters into the request', () => {
  const request = buildActionRequest({
    action: {
      method: 'POST',
      urlTemplate: 'https://api.test/orders/{{orderId}}?note={{note}}',
      headersEncrypted: null,
      bodyTemplate: '{"reason":"{{reason}}"}',
    },
    args: { orderId: 'A 1', note: 'hello', reason: 'damaged' },
  })
  expect(request.url).toBe('https://api.test/orders/A%201?note=hello')
  expect(request.body).toBe('{"reason":"damaged"}')
  expect(request.headers['content-type']).toBe('application/json')
})

it('rejects an invalid transition in the state machine', () => {
  expect(() => assertTransition('pending', 'succeeded')).toThrow(InvalidTransitionError)
})
