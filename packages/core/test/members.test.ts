import { beforeEach, expect, it } from 'vitest'
import { eq } from 'drizzle-orm'
import { db, invitation } from '@felops/db'
import { resetDb } from '@felops/db/test/helpers'
import { seedWorkspaceWithRole } from './fixtures'
import {
  inviteMember,
  acceptInvitation,
  listMembers,
  changeMemberRole,
  removeMember,
} from '../src/members/service'
import { ForbiddenError, InviteExpiredError } from '../src/errors'

beforeEach(resetDb)

it('does not let a member invite another member', async () => {
  const { workspaceId, userId } = await seedWorkspaceWithRole('member')
  await expect(
    inviteMember({ workspaceId, email: 'x@test.dev', role: 'member', invitedBy: userId }),
  ).rejects.toBeInstanceOf(ForbiddenError)
})

it('lets an admin invite and the invitation is single use', async () => {
  const { workspaceId, userId } = await seedWorkspaceWithRole('admin')
  const { invitation: invite, url } = await inviteMember({
    workspaceId,
    email: 'teammate@test.dev',
    role: 'member',
    invitedBy: userId,
  })
  expect(url).toContain(`/invite/${invite.token}`)

  const ws = await acceptInvitation(invite.token, 'user_teammate')
  expect(ws.id).toBe(workspaceId)
  await expect(acceptInvitation(invite.token, 'user_other')).rejects.toBeInstanceOf(
    InviteExpiredError,
  )
  const members = await listMembers(workspaceId)
  expect(members.some((member) => member.userId === 'user_teammate')).toBe(true)
})

it('rejects an expired invitation', async () => {
  const { workspaceId, userId } = await seedWorkspaceWithRole('owner')
  const { invitation: invite } = await inviteMember({
    workspaceId,
    email: 'late@test.dev',
    role: 'member',
    invitedBy: userId,
  })
  await db
    .update(invitation)
    .set({ expiresAt: new Date(Date.now() - 1000) })
    .where(eq(invitation.id, invite.id))
  await expect(acceptInvitation(invite.token, 'user_late')).rejects.toBeInstanceOf(
    InviteExpiredError,
  )
})

it('lets an owner change a role and remove a member', async () => {
  const { workspaceId, userId: ownerId } = await seedWorkspaceWithRole('owner')
  const [invite] = await db
    .insert(invitation)
    .values({
      workspaceId,
      email: 'm@test.dev',
      role: 'member',
      token: 'token-1',
      expiresAt: new Date(Date.now() + 10_000),
      invitedBy: ownerId,
    })
    .returning()
  await acceptInvitation(invite.token, 'user_member')
  await changeMemberRole({ workspaceId, targetUserId: 'user_member', role: 'admin', actorId: ownerId })
  const members = await listMembers(workspaceId)
  expect(members.find((member) => member.userId === 'user_member')?.role).toBe('admin')
  await removeMember({ workspaceId, targetUserId: 'user_member', actorId: ownerId })
  expect((await listMembers(workspaceId)).some((m) => m.userId === 'user_member')).toBe(false)
})
