import { and, eq, sql } from 'drizzle-orm'
import { db, usageCounter, workspace } from '@felops/db'
import { PLANS, type PlanId } from '@felops/config'
import { QuotaExceededError } from '../errors'

export function currentPeriod(date = new Date()): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`
}

async function planFor(workspaceId: string): Promise<{ plan: PlanId; limits: (typeof PLANS)[PlanId] }> {
  const [row] = await db
    .select({ plan: workspace.plan })
    .from(workspace)
    .where(eq(workspace.id, workspaceId))
    .limit(1)
  const plan = (row?.plan ?? 'free') as PlanId
  return { plan, limits: PLANS[plan] ?? PLANS.free }
}

export async function recordMessage(workspaceId: string, count = 1): Promise<void> {
  const period = currentPeriod()
  await db
    .insert(usageCounter)
    .values({ workspaceId, period, messages: count })
    .onConflictDoUpdate({
      target: [usageCounter.workspaceId, usageCounter.period],
      set: { messages: sql`${usageCounter.messages} + ${count}` },
    })
}

export async function recordIngestion(workspaceId: string, count = 1): Promise<void> {
  const period = currentPeriod()
  await db
    .insert(usageCounter)
    .values({ workspaceId, period, ingestions: count })
    .onConflictDoUpdate({
      target: [usageCounter.workspaceId, usageCounter.period],
      set: { ingestions: sql`${usageCounter.ingestions} + ${count}` },
    })
}

export async function getUsage(workspaceId: string) {
  const { plan, limits } = await planFor(workspaceId)
  const period = currentPeriod()
  const [row] = await db
    .select()
    .from(usageCounter)
    .where(and(eq(usageCounter.workspaceId, workspaceId), eq(usageCounter.period, period)))
    .limit(1)
  return {
    plan,
    period,
    limits,
    messages: row?.messages ?? 0,
    ingestions: row?.ingestions ?? 0,
  }
}

export async function assertWithinQuota(workspaceId: string): Promise<void> {
  const usage = await getUsage(workspaceId)
  if (usage.messages >= usage.limits.messages) {
    throw new QuotaExceededError(usage.limits.messages, usage.messages)
  }
}
