import {
  AgentNotPublicError,
  getPublicAgentConfig,
  OriginNotAllowedError,
} from '@/lib/public-agent'

export const dynamic = 'force-dynamic'

function cors(origin: string | null): Record<string, string> {
  return {
    'access-control-allow-origin': origin ?? '',
    'access-control-allow-methods': 'GET, OPTIONS',
    'access-control-allow-headers': 'content-type',
    vary: 'Origin',
    'cache-control': 'no-store',
  }
}

export async function OPTIONS(request: Request) {
  return new Response(null, { status: 204, headers: cors(request.headers.get('origin')) })
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ publicKey: string }> },
) {
  const { publicKey } = await params
  const origin = request.headers.get('origin')
  try {
    const config = await getPublicAgentConfig({ publicKey, origin })
    return Response.json(config, { headers: cors(origin) })
  } catch (error) {
    if (error instanceof OriginNotAllowedError) {
      return Response.json({ error: 'origin_not_allowed' }, { status: 403, headers: cors(null) })
    }
    if (error instanceof AgentNotPublicError) {
      return Response.json({ error: 'agent_not_found' }, { status: 404, headers: cors(origin) })
    }
    return Response.json({ error: 'internal_error' }, { status: 500, headers: cors(origin) })
  }
}
