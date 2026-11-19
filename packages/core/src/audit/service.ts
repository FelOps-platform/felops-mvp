import { and, desc, eq } from 'drizzle-orm'
import { auditEvent, db } from '@felops/db'

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0]
export type Executor = typeof db | Transaction

export type AuditInput = {
  workspaceId: string
  actorId?: string | null
  type: string
  targetType?: string | null
  targetId?: string | null
  data?: Record<string, unknown>
}

export async function recordAudit(input: AuditInput, executor: Executor = db) {
  const [row] = await executor
    .insert(auditEvent)
    .values({
      workspaceId: input.workspaceId,
      actorId: input.actorId ?? null,
      type: input.type,
      targetType: input.targetType ?? null,
      targetId: input.targetId ?? null,
      data: input.data ?? {},
    })
    .returning()
  return row
}

export async function listAuditEvents(workspaceId: string, limit = 10) {
  return db
    .select()
    .from(auditEvent)
    .where(eq(auditEvent.workspaceId, workspaceId))
    .orderBy(desc(auditEvent.createdAt))
    .limit(limit)
}

export async function findAuditForTarget(input: {
  workspaceId: string
  targetId: string
}) {
  return db
    .select()
    .from(auditEvent)
    .where(
      and(
        eq(auditEvent.workspaceId, input.workspaceId),
        eq(auditEvent.targetId, input.targetId),
      ),
    )
    .orderBy(desc(auditEvent.createdAt))
}
