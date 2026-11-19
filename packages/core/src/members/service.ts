import { randomBytes } from 'node:crypto'
import { and, eq, gt, isNull, sql } from 'drizzle-orm'
import { db, invitation, membership, user, workspace } from '@felops/db'
import type { Workspace, WorkspaceRole } from '@felops/db/schema'
import { ForbiddenError, InviteExpiredError, NotFoundError } from '../errors'
import { loadEnv } from '@felops/config'
import { sendInvitationEmail } from '../email/mailer'

export async function listMembers(workspaceId: string) {
  return db
    .select({
      userId: membership.userId,
      role: membership.role,
      name: user.name,
      email: user.email,
      createdAt: membership.createdAt,
    })
    .from(membership)
    .leftJoin(user, eq(membership.userId, user.id))
    .where(eq(membership.workspaceId, workspaceId))
}

async function roleOf(workspaceId: string, userId: string): Promise<WorkspaceRole | null> {
  const [row] = await db
    .select({ role: membership.role })
    .from(membership)
    .where(and(eq(membership.workspaceId, workspaceId), eq(membership.userId, userId)))
    .limit(1)
  return (row?.role as WorkspaceRole | undefined) ?? null
}

async function assertAdmin(workspaceId: string, userId: string): Promise<void> {
  const role = await roleOf(workspaceId, userId)
  if (role !== 'owner' && role !== 'admin') throw new ForbiddenError()
}

export async function inviteMember(input: {
  workspaceId: string
  email: string
  role: WorkspaceRole
  invitedBy: string
}) {
  await assertAdmin(input.workspaceId, input.invitedBy)
  const [ws] = await db
    .select()
    .from(workspace)
    .where(eq(workspace.id, input.workspaceId))
    .limit(1)
  if (!ws) throw new NotFoundError('Workspace not found')

  const token = randomBytes(24).toString('base64url')
  const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000)
  const [row] = await db
    .insert(invitation)
    .values({
      workspaceId: input.workspaceId,
      email: input.email.toLowerCase(),
      role: input.role,
      token,
      expiresAt,
      invitedBy: input.invitedBy,
    })
    .returning()

  const url = `${loadEnv().APP_URL}/invite/${token}`
  await sendInvitationEmail({ to: input.email, url, workspaceName: ws.name })
  return { invitation: row, url }
}

export async function listPendingInvitations(workspaceId: string) {
  return db
    .select()
    .from(invitation)
    .where(
      and(
        eq(invitation.workspaceId, workspaceId),
        isNull(invitation.acceptedAt),
        gt(invitation.expiresAt, new Date()),
      ),
    )
}

export async function getInvitationByToken(token: string) {
  const [row] = await db.select().from(invitation).where(eq(invitation.token, token)).limit(1)
  return row ?? null
}

export async function acceptInvitation(token: string, userId: string): Promise<Workspace> {
  return db.transaction(async (tx) => {
    const [row] = await tx
      .select()
      .from(invitation)
      .where(eq(invitation.token, token))
      .for('update')
      .limit(1)
    if (!row) throw new InviteExpiredError('Invitation not found')
    if (row.acceptedAt || row.expiresAt.getTime() <= Date.now()) {
      throw new InviteExpiredError()
    }

    await tx
      .insert(membership)
      .values({ userId, workspaceId: row.workspaceId, role: row.role })
      .onConflictDoUpdate({
        target: [membership.userId, membership.workspaceId],
        set: { role: row.role },
      })
    await tx
      .update(invitation)
      .set({ acceptedAt: new Date() })
      .where(eq(invitation.id, row.id))

    const [ws] = await tx.select().from(workspace).where(eq(workspace.id, row.workspaceId))
    return ws
  })
}

export async function revokeInvitation(input: { workspaceId: string; invitationId: string; userId: string }) {
  await assertAdmin(input.workspaceId, input.userId)
  await db
    .delete(invitation)
    .where(
      and(
        eq(invitation.id, input.invitationId),
        eq(invitation.workspaceId, input.workspaceId),
      ),
    )
}

export async function changeMemberRole(input: {
  workspaceId: string
  targetUserId: string
  role: WorkspaceRole
  actorId: string
}) {
  await assertAdmin(input.workspaceId, input.actorId)
  if (input.role !== 'owner') {
    const [owners] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(membership)
      .where(
        and(eq(membership.workspaceId, input.workspaceId), eq(membership.role, 'owner')),
      )
    const current = await roleOf(input.workspaceId, input.targetUserId)
    if (owners.count <= 1 && current === 'owner') {
      throw new ForbiddenError('A workspace must keep at least one owner')
    }
  }
  const [row] = await db
    .update(membership)
    .set({ role: input.role })
    .where(
      and(
        eq(membership.workspaceId, input.workspaceId),
        eq(membership.userId, input.targetUserId),
      ),
    )
    .returning()
  if (!row) throw new NotFoundError('Member not found')
  return row
}

export async function removeMember(input: {
  workspaceId: string
  targetUserId: string
  actorId: string
}) {
  await assertAdmin(input.workspaceId, input.actorId)
  const [owners] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(membership)
    .where(and(eq(membership.workspaceId, input.workspaceId), eq(membership.role, 'owner')))
  const current = await roleOf(input.workspaceId, input.targetUserId)
  if (owners.count <= 1 && current === 'owner') {
    throw new ForbiddenError('A workspace must keep at least one owner')
  }
  await db
    .delete(membership)
    .where(
      and(
        eq(membership.workspaceId, input.workspaceId),
        eq(membership.userId, input.targetUserId),
      ),
    )
}
