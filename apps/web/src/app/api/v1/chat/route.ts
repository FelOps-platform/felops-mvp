import { z } from 'zod'
import { loadEnv, MAX_MESSAGE_LENGTH, PUBLIC_CHAT_RATE_LIMIT, PUBLIC_CHAT_RATE_WINDOW_SECONDS } from '@felops/config'
import { answer } from '@felops/core/chat'
import {
  AppError,
  HumanControlledError,
  QuotaExceededError,
  RateLimitExceededError,
} from '@felops/core/errors'
import { rateLimit } from '@felops/core/rate-limit'
import {
  AgentNotPublicError,
  getPublicAgent,
  isOriginAllowed,
  OriginNotAllowedError,
} from '@/lib/public-agent'
import { logger } from '@/lib/logger'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const bodySchema = z.object({
  conversationId: z.string().uuid().optional(),
  message: z.string().min(1).max(MAX_MESSAGE_LENGTH),
})

function cors(origin: string | null): Record<string, string> {
  return {
    'access-control-allow-origin': origin ?? '',
    'access-control-allow-headers': 'x-agent-key, content-type',
    'access-control-allow-methods': 'POST, OPTIONS',
    vary: 'Origin',
  }
}

function clientIp(request: Request): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  )
}

export async function OPTIONS(request: Request) {
  const origin = request.headers.get('origin')
  return new Response(null, { status: 204, headers: cors(origin) })
}

export async function POST(request: Request) {
  const startedAt = Date.now()
  const origin = request.headers.get('origin')
  const publicKey = request.headers.get('x-agent-key') ?? ''

  const parsed = bodySchema.safeParse(await request.json().catch(() => ({})))
  if (!parsed.success) {
    return Response.json({ error: 'invalid_message' }, { status: 422, headers: cors(origin) })
  }
  if (parsed.data.message.length > MAX_MESSAGE_LENGTH) {
    return Response.json({ error: 'message_too_long' }, { status: 422, headers: cors(origin) })
  }

  let agent
  try {
    agent = await getPublicAgent(publicKey)
  } catch (error) {
    if (error instanceof AgentNotPublicError) {
      return Response.json({ error: 'agent_not_found' }, { status: 404, headers: cors(origin) })
    }
    throw error
  }

  if (!isOriginAllowed(agent, origin)) {
    return Response.json({ error: 'origin_not_allowed' }, { status: 403, headers: cors(origin) })
  }

  const ip = clientIp(request)
  try {
    await rateLimit({
      key: `chat:${publicKey}:${ip}`,
      limit: PUBLIC_CHAT_RATE_LIMIT,
      windowSeconds: PUBLIC_CHAT_RATE_WINDOW_SECONDS,
    })
  } catch (error) {
    if (error instanceof RateLimitExceededError) {
      return Response.json(
        { error: 'rate_limited' },
        {
          status: 429,
          headers: {
            ...cors(origin),
            'retry-after': String(error.retryAfter),
          },
        },
      )
    }
    throw error
  }

  try {
    const result = await answer({
      workspaceId: agent.workspaceId,
      agentId: agent.id,
      conversationId: parsed.data.conversationId,
      visitorId: `visitor_${ip.replace(/[^a-zA-Z0-9]/g, '_')}`,
      message: parsed.data.message,
      channel: origin === loadEnv().APP_URL ? 'hosted' : 'widget',
    })
    logger.info('chat.stream', {
      workspaceId: agent.workspaceId,
      agentId: agent.id,
      conversationId: result.conversationId,
      route: '/api/v1/chat',
      status: 200,
      durationMs: Date.now() - startedAt,
    })
    return new Response(result.stream, {
      headers: {
        ...cors(origin),
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
        { status: 429, headers: cors(origin) },
      )
    }
    if (error instanceof HumanControlledError) {
      return Response.json(
        { error: 'human_controlled', message: error.message },
        { status: 409, headers: cors(origin) },
      )
    }
    if (error instanceof RateLimitExceededError) {
      return Response.json(
        { error: 'rate_limited' },
        { status: 429, headers: { ...cors(origin), 'retry-after': String(error.retryAfter) } },
      )
    }
    if (error instanceof AppError) {
      return Response.json({ error: error.code }, { status: error.status, headers: cors(origin) })
    }
    logger.error('chat.failed', {
      workspaceId: agent.workspaceId,
      agentId: agent.id,
      route: '/api/v1/chat',
      status: 500,
      durationMs: Date.now() - startedAt,
    })
    return Response.json({ error: 'internal_error' }, { status: 500, headers: cors(origin) })
  }
}
