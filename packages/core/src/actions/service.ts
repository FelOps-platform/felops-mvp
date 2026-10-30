import { randomUUID } from 'node:crypto'
import { sql } from 'drizzle-orm'
import Ajv from 'ajv'
import { and, desc, eq } from 'drizzle-orm'
import {
  action,
  actionRun,
  conversation,
  db,
  membership,
} from '@felops/db'
import type { ActionRunStatus } from '@felops/db/schema'
import { AppError, ForbiddenError, NotFoundError } from '../errors'
import { actionQueue } from '../queue'
import { appendSystemMessage } from '../chat/service'
import { recordAudit } from '../audit/service'
import { assertSafePublicUrl } from './ssrf'
import { encryptJson, decryptJson, type EncryptedPayload } from './crypto'
import { assertTransition } from './state'
import { executeActionRun } from './executor'
import { ActionNotFoundError } from '../agents/types'

const ajv = new Ajv({ allErrors: true, strict: false })

export type CreateActionInput = {
  workspaceId: string
  agentId: string
  name: string
  description?: string
  method: 'GET' | 'POST'
  urlTemplate: string
  headers?: Record<string, string>
  bodyTemplate?: string | null
  parameters?: Record<string, unknown>
  approvalRequired?: boolean
  enabled?: boolean
}

export async function createAction(input: CreateActionInput) {
  assertSafePublicUrl(input.urlTemplate.replace(/\{\{[^}]+\}\}/g, 'placeholder'))
  const [row] = await db
    .insert(action)
    .values({
      workspaceId: input.workspaceId,
      agentId: input.agentId,
      name: input.name,
      description: input.description ?? '',
      method: input.method,
      urlTemplate: input.urlTemplate,
      headersEncrypted: input.headers ? encryptJson(input.headers) : null,
      bodyTemplate: input.bodyTemplate ?? null,
      parameters: input.parameters ?? {},
      approvalRequired: input.approvalRequired ?? true,
      enabled: input.enabled ?? true,
    })
    .returning()
  return row
}

export async function updateAction(input: {
  workspaceId: string
  actionId: string
  patch: Partial<Omit<CreateActionInput, 'workspaceId' | 'agentId'>>
}) {
  const { workspaceId, actionId, patch } = input
  if (patch.urlTemplate) {
    assertSafePublicUrl(patch.urlTemplate.replace(/\{\{[^}]+\}\}/g, 'placeholder'))
  }
  const [row] = await db
    .update(action)
    .set({
      ...(patch.name === undefined ? {} : { name: patch.name }),
      ...(patch.description === undefined ? {} : { description: patch.description }),
      ...(patch.method === undefined ? {} : { method: patch.method }),
      ...(patch.urlTemplate === undefined ? {} : { urlTemplate: patch.urlTemplate }),
      ...(patch.headers === undefined ? {} : { headersEncrypted: encryptJson(patch.headers) }),
      ...(patch.bodyTemplate === undefined ? {} : { bodyTemplate: patch.bodyTemplate }),
      ...(patch.parameters === undefined ? {} : { parameters: patch.parameters }),
      ...(patch.approvalRequired === undefined
        ? {}
        : { approvalRequired: patch.approvalRequired }),
      ...(patch.enabled === undefined ? {} : { enabled: patch.enabled }),
      updatedAt: new Date(),
    })
    .where(and(eq(action.id, actionId), eq(action.workspaceId, workspaceId)))
    .returning()
  if (!row) throw new ActionNotFoundError()
  return row
}

export async function listActions(input: { workspaceId: string; agentId: string }) {
  return db
    .select()
    .from(action)
    .where(
      and(eq(action.workspaceId, input.workspaceId), eq(action.agentId, input.agentId)),
    )
    .orderBy(desc(action.createdAt))
}

export async function getAction(input: { workspaceId: string; actionId: string }) {
  const [row] = await db
    .select()
    .from(action)
    .where(and(eq(action.id, input.actionId), eq(action.workspaceId, input.workspaceId)))
    .limit(1)
  return row ?? null
}

export async function deleteAction(input: { workspaceId: string; actionId: string }) {
  const [row] = await db
    .delete(action)
    .where(and(eq(action.id, input.actionId), eq(action.workspaceId, input.workspaceId)))
    .returning()
  if (!row) throw new ActionNotFoundError()
}

function validateArgs(schema: Record<string, unknown>, args: Record<string, unknown>): void {
  if (!schema || Object.keys(schema).length === 0) return
  const validate = ajv.compile(schema)
  if (!validate(args)) {
    const detail = ajv.errorsText(validate.errors, { separator: '; ' })
    throw new AppError(`Invalid action parameters: ${detail}`, 'invalid_arguments', 422)
  }
}

export async function requestActionRun(input: {
  workspaceId: string
  agentId: string
  actionId: string
  conversationId?: string
  args?: Record<string, unknown>
  actorId?: string
}) {
  const [act] = await db
    .select()
    .from(action)
    .where(
      and(
        eq(action.id, input.actionId),
        eq(action.workspaceId, input.workspaceId),
        eq(action.agentId, input.agentId),
        eq(action.enabled, true),
      ),
    )
    .limit(1)
  if (!act) throw new ActionNotFoundError()

  if (input.conversationId) {
    const [conv] = await db
      .select({ id: conversation.id })
      .from(conversation)
      .where(
        and(
          eq(conversation.id, input.conversationId),
          eq(conversation.workspaceId, input.workspaceId),
        ),
      )
      .limit(1)
    if (!conv) throw new NotFoundError('Conversation not found')
  }

  const args = input.args ?? {}
  validateArgs(act.parameters, args)

  const runId = randomUUID()
  const requiresApproval = act.approvalRequired
  const [run] = await db
    .insert(actionRun)
    .values({
      id: runId,
      workspaceId: input.workspaceId,
      agentId: input.agentId,
      actionId: act.id,
      conversationId: input.conversationId ?? null,
      status: requiresApproval ? 'pending' : 'approved',
      args,
      idempotencyKey: runId,
      approvedBy: requiresApproval ? null : 'system',
      approvedAt: requiresApproval ? null : new Date(),
    })
    .returning()

  await recordAudit({
    workspaceId: input.workspaceId,
    actorId: input.actorId ?? 'agent',
    type: 'action_run.requested',
    targetType: 'action_run',
    targetId: run.id,
    data: { actionId: act.id, status: run.status, args },
  })

  if (requiresApproval) {
    if (input.conversationId) {
      await appendSystemMessage({
        workspaceId: input.workspaceId,
        conversationId: input.conversationId,
        content: 'Action is waiting for approval',
      })
    }
  } else {
    await recordAudit({
      workspaceId: input.workspaceId,
      actorId: 'system',
      type: 'action_run.approved',
      targetType: 'action_run',
      targetId: run.id,
      data: { automatic: true },
    })
    await actionQueue.add('execute-action', { runId: run.id }, { jobId: run.id })
  }

  return run
}

export async function approveActionRun(input: {
  workspaceId: string
  runId: string
  userId: string
}) {
  const result = await db.transaction(async (tx) => {
    const [run] = await tx
      .select()
      .from(actionRun)
      .where(
        and(
          eq(actionRun.id, input.runId),
          eq(actionRun.workspaceId, input.workspaceId),
        ),
      )
      .for('update')
      .limit(1)
    if (!run) throw new NotFoundError('Action run not found')

    const [member] = await tx
      .select({ role: membership.role })
      .from(membership)
      .where(
        and(
          eq(membership.userId, input.userId),
          eq(membership.workspaceId, input.workspaceId),
        ),
      )
      .limit(1)
    if (!member || (member.role !== 'owner' && member.role !== 'admin')) {
      throw new ForbiddenError('Only owners and admins can approve actions')
    }

    if (['approved', 'running', 'succeeded', 'failed'].includes(run.status)) {
      return { run, transitioned: false }
    }
    assertTransition(run.status as ActionRunStatus, 'approved')

    const [updated] = await tx
      .update(actionRun)
      .set({ status: 'approved', approvedBy: input.userId, approvedAt: new Date() })
      .where(eq(actionRun.id, run.id))
      .returning()

    await recordAudit(
      {
        workspaceId: input.workspaceId,
        actorId: input.userId,
        type: 'action_run.approved',
        targetType: 'action_run',
        targetId: run.id,
        data: { status: 'approved' },
      },
      tx,
    )
    return { run: updated, transitioned: true }
  })

  if (result.transitioned) {
    await actionQueue.add(
      'execute-action',
      { runId: result.run.id },
      { jobId: result.run.id },
    )
  }
  return result.run
}

export async function rejectActionRun(input: {
  workspaceId: string
  runId: string
  userId: string
}) {
  return db.transaction(async (tx) => {
    const [run] = await tx
      .select()
      .from(actionRun)
      .where(and(eq(actionRun.id, input.runId), eq(actionRun.workspaceId, input.workspaceId)))
      .for('update')
      .limit(1)
    if (!run) throw new NotFoundError('Action run not found')

    const [member] = await tx
      .select({ role: membership.role })
      .from(membership)
      .where(
        and(
          eq(membership.userId, input.userId),
          eq(membership.workspaceId, input.workspaceId),
        ),
      )
      .limit(1)
    if (!member || (member.role !== 'owner' && member.role !== 'admin')) {
      throw new ForbiddenError('Only owners and admins can reject actions')
    }

    if (run.status === 'rejected') return run
    assertTransition(run.status as ActionRunStatus, 'rejected')

    const [updated] = await tx
      .update(actionRun)
      .set({ status: 'rejected', approvedBy: input.userId, finishedAt: new Date() })
      .where(eq(actionRun.id, run.id))
      .returning()

    await recordAudit(
      {
        workspaceId: input.workspaceId,
        actorId: input.userId,
        type: 'action_run.rejected',
        targetType: 'action_run',
        targetId: run.id,
        data: { status: 'rejected' },
      },
      tx,
    )
    return updated
  })
}

export async function listActionRuns(input: {
  workspaceId: string
  status?: ActionRunStatus
  limit?: number
}) {
  const conditions = [eq(actionRun.workspaceId, input.workspaceId)]
  if (input.status) conditions.push(eq(actionRun.status, input.status))
  return db
    .select({
      run: actionRun,
      actionName: action.name,
      actionMethod: action.method,
      conversationStatus: conversation.status,
    })
    .from(actionRun)
    .innerJoin(action, eq(actionRun.actionId, action.id))
    .leftJoin(conversation, eq(actionRun.conversationId, conversation.id))
    .where(and(...conditions))
    .orderBy(desc(actionRun.createdAt))
    .limit(input.limit ?? 50)
}

export async function listPendingRuns(workspaceId: string) {
  return listActionRuns({ workspaceId, status: 'pending' })
}

export async function getActionRun(input: { workspaceId: string; runId: string }) {
  const [row] = await db
    .select()
    .from(actionRun)
    .where(
      and(eq(actionRun.id, input.runId), eq(actionRun.workspaceId, input.workspaceId)),
    )
    .limit(1)
  return row ?? null
}

export async function listAgentActionRuns(input: {
  workspaceId: string
  agentId: string
  limit?: number
}) {
  return db
    .select()
    .from(actionRun)
    .where(
      and(
        eq(actionRun.workspaceId, input.workspaceId),
        eq(actionRun.agentId, input.agentId),
      ),
    )
    .orderBy(desc(actionRun.createdAt))
    .limit(input.limit ?? 20)
}

export async function listRunAudit(input: { workspaceId: string; runId: string }) {
  const rows = await db.execute<{
    id: string
    type: string
    actor_id: string | null
    data: Record<string, unknown>
    created_at: Date
  }>(sql`
    select id, type, actor_id, data, created_at
    from audit_event
    where workspace_id = ${input.workspaceId} and target_id = ${input.runId}
    order by created_at asc
  `)
  return rows
}

export { executeActionRun }
