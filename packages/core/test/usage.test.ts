import { beforeEach, expect, it } from 'vitest'
import { eq } from 'drizzle-orm'
import { db, usageCounter } from '@felops/db'
import { resetDb } from '@felops/db/test/helpers'
import { createWorkspaceFixture } from '@felops/db/test/fixtures'
import { assertWithinQuota, recordMessage, getUsage } from '../src/usage/service'
import { QuotaExceededError } from '../src/errors'

beforeEach(resetDb)

it('allows the last free message and rejects the next one', async () => {
  const ws = await createWorkspaceFixture('quota')
  for (let i = 0; i < 100; i += 1) await recordMessage(ws.id)
  await expect(assertWithinQuota(ws.id)).rejects.toBeInstanceOf(QuotaExceededError)
})

it('counts against the current month only', async () => {
  const ws = await createWorkspaceFixture('period')
  await recordMessage(ws.id)
  await db.update(usageCounter).set({ period: '2020-01' }).where(eq(usageCounter.workspaceId, ws.id))
  await expect(assertWithinQuota(ws.id)).resolves.toBeUndefined()
})

it('reports the plan limits', async () => {
  const ws = await createWorkspaceFixture('usage')
  await recordMessage(ws.id, 3)
  const usage = await getUsage(ws.id)
  expect(usage.plan).toBe('free')
  expect(usage.messages).toBe(3)
  expect(usage.limits.messages).toBe(100)
})
