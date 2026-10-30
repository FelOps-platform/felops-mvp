import { beforeEach, expect, it } from 'vitest'
import { resetDb } from '@felops/db/test/helpers'
import { createWorkspace, assertMembership, listUserWorkspaces } from '../src/workspaces/service'
import { SlugTakenError, ForbiddenError } from '../src/errors'

beforeEach(resetDb)

it('creates a workspace and an owner membership atomically', async () => {
  const ws = await createWorkspace({ userId: 'user_1', name: 'Cairo Threads', slug: 'cairo-threads' })
  const ctx = await assertMembership({ userId: 'user_1', workspaceSlug: ws.slug })
  expect(ctx.role).toBe('owner')
})

it('rejects a duplicate slug', async () => {
  await createWorkspace({ userId: 'user_1', name: 'A', slug: 'same' })
  await expect(
    createWorkspace({ userId: 'user_2', name: 'B', slug: 'same' }),
  ).rejects.toBeInstanceOf(SlugTakenError)
})

it('lists only the workspaces the user belongs to', async () => {
  await createWorkspace({ userId: 'user_1', name: 'Alpha', slug: 'alpha' })
  await createWorkspace({ userId: 'user_1', name: 'Beta', slug: 'beta' })
  await createWorkspace({ userId: 'user_2', name: 'Gamma', slug: 'gamma' })
  const workspaces = await listUserWorkspaces('user_1')
  expect(workspaces.map((w) => w.slug)).toEqual(['alpha', 'beta'])
})

it('forbids a non-member', async () => {
  await createWorkspace({ userId: 'user_1', name: 'A', slug: 'private' })
  await expect(
    assertMembership({ userId: 'user_2', workspaceSlug: 'private' }),
  ).rejects.toBeInstanceOf(ForbiddenError)
})
