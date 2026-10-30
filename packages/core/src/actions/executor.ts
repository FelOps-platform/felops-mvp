import { and, eq } from 'drizzle-orm'
import { action, actionRun, db } from '@felops/db'
import type { ActionRunStatus } from '@felops/db/schema'
import {
  ACTION_TIMEOUT_MS,
  MAX_ACTION_ATTEMPTS,
  MAX_ACTION_RESPONSE_BYTES,
} from '@felops/config'
import { AppError, NotFoundError } from '../errors'
import { recordAudit } from '../audit/service'
import { appendSystemMessage } from '../chat/service'
import { assertSafeActionUrl } from './ssrf'
import { decryptJson, type EncryptedPayload } from './crypto'
import { assertTransition } from './state'

export type ActionRequest = {
  method: 'GET' | 'POST'
  url: string
  headers: Record<string, string>
  body?: string
}

function substitute(template: string, args: Record<string, unknown>, encode: boolean): string {
  return template.replace(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g, (_, key: string) => {
    const value = args[key]
    const text = value === undefined || value === null ? '' : String(value)
    return encode ? encodeURIComponent(text) : text
  })
}

function safeHeaders(record: Record<string, string>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(record).filter(([key]) => {
      const lower = key.toLowerCase()
      return !['authorization', 'cookie', 'x-api-key', 'proxy-authorization'].includes(lower)
    }),
  )
}

export function buildActionRequest(input: {
  action: {
    method: string
    urlTemplate: string
    headersEncrypted: EncryptedPayload | null
    bodyTemplate: string | null
  }
  args: Record<string, unknown>
}): ActionRequest {
  const headers: Record<string, string> = input.action.headersEncrypted
    ? decryptJson<Record<string, string>>(input.action.headersEncrypted)
    : {}
  const resolvedHeaders = Object.fromEntries(
    Object.entries(headers).map(([key, value]) => [key, substitute(value, input.args, false)]),
  )
  const body =
    input.action.bodyTemplate !== null
      ? substitute(input.action.bodyTemplate, input.args, false)
      : input.action.method === 'POST'
        ? JSON.stringify(input.args)
        : undefined
  if (body && !resolvedHeaders['content-type'] && !resolvedHeaders['Content-Type']) {
    resolvedHeaders['content-type'] = 'application/json'
  }
  return {
    method: input.action.method === 'GET' ? 'GET' : 'POST',
    url: substitute(input.action.urlTemplate, input.args, true),
    headers: resolvedHeaders,
    body,
  }
}

async function fetchWithSafeRedirects(
  request: ActionRequest,
  fetchImpl: typeof fetch,
): Promise<{ response: Response; finalUrl: string }> {
  let url = request.url
  for (let redirect = 0; redirect < 5; redirect += 1) {
    await assertSafeActionUrl(url)
    const response = await fetchImpl(url, {
      method: request.method,
      headers: request.headers,
      body: request.body,
      redirect: 'manual',
      signal: AbortSignal.timeout(ACTION_TIMEOUT_MS),
    })
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location')
      if (!location) return { response, finalUrl: url }
      url = new URL(location, url).toString()
      continue
    }
    return { response, finalUrl: url }
  }
  throw new AppError('Action request exceeded the redirect limit', 'too_many_redirects', 502)
}

export async function executeActionRun(
  runId: string,
  options: { fetchImpl?: typeof fetch } = {},
) {
  const [run] = await db.select().from(actionRun).where(eq(actionRun.id, runId)).limit(1)
  if (!run) throw new NotFoundError('Action run not found')
  if (run.status === 'succeeded' || run.status === 'rejected') return run
  if (run.status === 'pending') throw new AppError('Action run is not approved', 'not_approved', 409)
  if (run.status === 'failed' && run.attempts >= MAX_ACTION_ATTEMPTS) {
    throw new AppError('Action run reached the retry limit', 'retry_limit', 409)
  }

  const [act] = await db
    .select()
    .from(action)
    .where(and(eq(action.id, run.actionId), eq(action.workspaceId, run.workspaceId)))
    .limit(1)
  if (!act) throw new NotFoundError('Action not found')

  assertTransition(run.status as ActionRunStatus, 'running')
  const attempts = run.attempts + 1
  await db
    .update(actionRun)
    .set({ status: 'running', attempts })
    .where(eq(actionRun.id, run.id))
  await recordAudit({
    workspaceId: run.workspaceId,
    actorId: 'worker',
    type: 'action_run.started',
    targetType: 'action_run',
    targetId: run.id,
    data: { attempt: attempts },
  })

  const request = buildActionRequest({
    action: {
      method: act.method,
      urlTemplate: act.urlTemplate,
      headersEncrypted: act.headersEncrypted,
      bodyTemplate: act.bodyTemplate,
    },
    args: run.args,
  })

  try {
    const { response, finalUrl } = await fetchWithSafeRedirects(
      request,
      options.fetchImpl ?? fetch,
    )
    const text = await response.text()
    const body = text.slice(0, MAX_ACTION_RESPONSE_BYTES)
    const succeeded = response.status >= 200 && response.status < 300

    await db
      .update(actionRun)
      .set({
        status: succeeded ? 'succeeded' : 'failed',
        request: {
          method: request.method,
          url: finalUrl,
          body: request.body ?? null,
          headers: Object.keys(safeHeaders(request.headers)),
        },
        response: { status: response.status, body },
        error: succeeded ? null : `HTTP ${response.status}`,
        finishedAt: new Date(),
      })
      .where(eq(actionRun.id, run.id))

    await recordAudit({
      workspaceId: run.workspaceId,
      actorId: 'worker',
      type: succeeded ? 'action_run.succeeded' : 'action_run.failed',
      targetType: 'action_run',
      targetId: run.id,
      data: { status: response.status, attempt: attempts },
    })

    if (run.conversationId) {
      await appendSystemMessage({
        workspaceId: run.workspaceId,
        conversationId: run.conversationId,
        content: succeeded
          ? `Action "${act.name}" succeeded (HTTP ${response.status}).`
          : `Action "${act.name}" failed (HTTP ${response.status}).`,
      })
    }

    return db.select().from(actionRun).where(eq(actionRun.id, run.id)).then(([row]) => row)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Action request failed'
    await db
      .update(actionRun)
      .set({
        status: 'failed',
        error: message.slice(0, 500),
        finishedAt: new Date(),
        request: {
          method: request.method,
          url: request.url,
          body: request.body ?? null,
          headers: Object.keys(safeHeaders(request.headers)),
        },
      })
      .where(eq(actionRun.id, run.id))
    await recordAudit({
      workspaceId: run.workspaceId,
      actorId: 'worker',
      type: 'action_run.failed',
      targetType: 'action_run',
      targetId: run.id,
      data: { error: message.slice(0, 500), attempt: attempts },
    })
    return db.select().from(actionRun).where(eq(actionRun.id, run.id)).then(([row]) => row)
  }
}
