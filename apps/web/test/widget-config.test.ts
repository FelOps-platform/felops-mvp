import { beforeAll, expect, it } from 'vitest'
import { randomUUID } from 'node:crypto'
import { db, workspace } from '@felops/db'
import { agent } from '@felops/db/schema'
import { resetDb } from '@felops/db/test/helpers'
import { getPublicAgentConfig, OriginNotAllowedError } from '../src/lib/public-agent'

beforeAll(async () => {
  await resetDb()
  const [ws] = await db
    .insert(workspace)
    .values({ name: 'Cairo Threads', slug: `widget-${randomUUID().slice(0, 8)}` })
    .returning()
  await db.insert(agent).values([
    {
      workspaceId: ws.id,
      name: 'Support',
      slug: 'support',
      status: 'active',
      publicKey: 'seeded-key',
      allowedOrigins: ['https://shop.test'],
      greeting: 'أهلاً بيك',
      language: 'ar+en',
      instructions: { role: 'Help', language: 'ar+en', constraints: '', responseFormat: '' },
    },
    {
      workspaceId: ws.id,
      name: 'Draft',
      slug: 'draft',
      status: 'draft',
      publicKey: 'draft-key',
      allowedOrigins: [],
      instructions: { role: 'Help', language: 'ar', constraints: '', responseFormat: '' },
    },
  ])
})

it('rejects an origin that is not allowlisted', async () => {
  await expect(
    getPublicAgentConfig({ publicKey: 'seeded-key', origin: 'https://evil.example' }),
  ).rejects.toBeInstanceOf(OriginNotAllowedError)
})

it('omits workspace data and instructions from the public config', async () => {
  const config = await getPublicAgentConfig({ publicKey: 'seeded-key', origin: 'https://shop.test' })
  expect(config).toEqual({
    name: expect.any(String),
    greeting: expect.any(String),
    language: expect.any(String),
    theme: expect.any(Object),
  })
  expect(JSON.stringify(config)).not.toContain('workspace')
  expect(JSON.stringify(config)).not.toContain('instructions')
})

it('accepts the app origin for hosted pages', async () => {
  const config = await getPublicAgentConfig({
    publicKey: 'seeded-key',
    origin: 'http://localhost:3000',
  })
  expect(config.name).toBe('Support')
})

it('does not expose an inactive agent', async () => {
  await expect(
    getPublicAgentConfig({ publicKey: 'draft-key', origin: 'https://shop.test' }),
  ).rejects.toThrow(/not found/i)
})
