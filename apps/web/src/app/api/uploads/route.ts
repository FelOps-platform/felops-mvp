import { findAgent } from '@felops/db/repositories/agents'
import { MAX_UPLOAD_BYTES, UPLOAD_MIME_TYPES } from '@felops/config'
import { putObject, sourceStorageKey } from '@felops/core/storage/s3'
import { getSessionUser, requireWorkspaceMemberApi } from '@/lib/workspace'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  const session = await getSessionUser()
  if (!session) return Response.json({ error: 'unauthorized' }, { status: 401 })

  const form = await request.formData()
  const file = form.get('file')
  const workspaceSlug = String(form.get('workspaceSlug') ?? '')
  const agentId = String(form.get('agentId') ?? '')

  if (!(file instanceof File)) {
    return Response.json({ error: 'file_required' }, { status: 400 })
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return Response.json({ error: 'file_too_large' }, { status: 413 })
  }
  if (!(UPLOAD_MIME_TYPES as readonly string[]).includes(file.type)) {
    return Response.json({ error: 'unsupported_type' }, { status: 415 })
  }

  const membership = await requireWorkspaceMemberApi(workspaceSlug)
  if (!membership) return Response.json({ error: 'forbidden' }, { status: 403 })

  const agent = await findAgent({ workspaceId: membership.workspace.id, agentId })
  if (!agent) return Response.json({ error: 'agent_not_found' }, { status: 404 })

  const key = sourceStorageKey(membership.workspace.id, file.name)
  await putObject({
    key,
    body: new Uint8Array(await file.arrayBuffer()),
    contentType: file.type,
  })

  return Response.json({ key, name: file.name, mime: file.type })
}
