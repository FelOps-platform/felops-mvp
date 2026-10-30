import { and, eq } from 'drizzle-orm'
import { action, actionRun, db } from '@felops/db'
import { requestActionRun } from './service'

const INTENTS: Record<string, string[]> = {
  refund: ['refund', 'return', 'أرجّع', 'ارجع', 'استرجاع', 'استرداد', 'مرتجع', 'ترجيع'],
  order: ['order status', 'track', 'أوردر', 'اوردر', 'طلب', 'شحنة', 'تتبع'],
  ticket: ['ticket', 'complaint', 'تذكرة', 'شكوى', 'مشكلة'],
}
const INTENT_KEYS = ['refund', 'order', 'ticket']

function matchingIntents(text: string): string[] {
  const lower = text.toLowerCase()
  return INTENT_KEYS.filter((key) =>
    INTENTS[key].some((word) => lower.includes(word.toLowerCase())),
  )
}

function buildArgs(
  parameters: Record<string, unknown>,
  message: string,
): Record<string, unknown> | null {
  const properties =
    typeof parameters === 'object' && parameters && 'properties' in parameters
      ? ((parameters as { properties?: Record<string, unknown> }).properties ?? {})
      : {}
  const required =
    typeof parameters === 'object' && parameters && 'required' in parameters
      ? ((parameters as { required?: string[] }).required ?? [])
      : []
  const args: Record<string, unknown> = {}
  for (const [key, raw] of Object.entries(properties)) {
    const property = raw as { type?: string }
    if (property.type !== 'string') continue
    if (/reason|note|description|message/i.test(key)) args[key] = message.slice(0, 500)
    else if (/order|id/i.test(key)) {
      const match = message.match(/[A-Z]{1,4}-?\d{2,}/i)
      args[key] = match?.[0] ?? 'unknown'
    } else if (required.includes(key)) {
      args[key] = message.slice(0, 200)
    }
  }
  for (const key of required) {
    if (args[key] === undefined) return null
  }
  return args
}

/**
 * Deterministic action proposal used for the playground/demo path. Sensitive
 * actions still pause in the approval queue; this only creates a pending run.
 */
export async function maybeRequestAction(input: {
  workspaceId: string
  agentId: string
  conversationId?: string
  message: string
}) {
  const intents = matchingIntents(input.message)
  if (intents.length === 0) return null

  const actions = await db
    .select()
    .from(action)
    .where(
      and(
        eq(action.workspaceId, input.workspaceId),
        eq(action.agentId, input.agentId),
        eq(action.enabled, true),
      ),
    )

  for (const candidate of actions) {
    const haystack = `${candidate.name} ${candidate.description}`.toLowerCase()
    if (!intents.some((intent) => haystack.includes(intent))) continue

    if (input.conversationId) {
      const [existing] = await db
        .select({ id: actionRun.id })
        .from(actionRun)
        .where(
          and(
            eq(actionRun.actionId, candidate.id),
            eq(actionRun.conversationId, input.conversationId),
            eq(actionRun.status, 'pending'),
          ),
        )
        .limit(1)
      if (existing) return null
    }

    const args = buildArgs(candidate.parameters, input.message)
    if (!args) return null

    try {
      return await requestActionRun({
        workspaceId: input.workspaceId,
        agentId: input.agentId,
        actionId: candidate.id,
        conversationId: input.conversationId,
        args,
        actorId: 'agent',
      })
    } catch {
      return null
    }
  }
  return null
}
