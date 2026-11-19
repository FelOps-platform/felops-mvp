import { z } from 'zod'
import { answer } from '@felops/core/chat'
import { AppError, QuotaExceededError, RateLimitExceededError } from '@felops/core/errors'
import { findAgent } from '@felops/db/repositories/agents'
import { requireWorkspaceMemberApi } from '@/lib/workspace'
import { MAX_MESSAGE_LENGTH } from '@felops/config'

const bodySchema = z.object({
  workspaceSlug: z.string().min(1),
  conversationId: z.string().uuid().optional(),
  message: z.string().min(1).max(MAX_MESSAGE_LENGTH),
})

export async function POST(
  request: Request,
  { params }: { params: Promise<{ agentId: string }> },
) {
  const { agentId } = await params
  const parsed = bodySchema.safeParse(await request.json().catch(() => ({})))
  if (!parsed.success) return Response.json({ error: 'invalid_body' }, { status: 422 })

  const membership = await requireWorkspaceMemberApi(parsed.data.workspaceSlug)
  if (!membership) return Response.json({ error: 'forbidden' }, { status: 403 })

  const agent = await findAgent({ workspaceId: membership.workspace.id, agentId })
  if (!agent) return Response.json({ error: 'agent_not_found' }, { status: 404 })

  try {
    const result = await answer({
      workspaceId: membership.workspace.id,
      agentId,
      conversationId: parsed.data.conversationId,
      message: parsed.data.message,
      channel: 'playground',
    })
    return new Response(result.stream, {
      headers: {
        'content-type': 'text/event-stream; charset=utf-8',
        'cache-control': 'no-cache, no-transform',
        connection: 'keep-alive',
        'x-accel-buffering': 'no',
      },
    })
  } catch (error) {
    if (error instanceof QuotaExceededError) {
      return Response.json(
        {
          error: 'quota_exceeded',
          limit: error.limit,
          used: error.used,
          upgradeUrl: 'mailto:sales@felops.io?subject=Upgrade%20my%20Felops%20plan',
        },
        { status: 429 },
      )
    }
    if (error instanceof RateLimitExceededError) {
      return Response.json({ error: 'rate_limited' }, { status: 429 })
    }
    if (error instanceof AppError) {
      return Response.json({ error: error.code, message: error.message }, { status: error.status })
    }
    return Response.json({ error: 'internal_error' }, { status: 500 })
  }
}
