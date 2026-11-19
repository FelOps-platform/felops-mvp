import { z } from 'zod'
import { rejectActionRun } from '@felops/core/approvals'
import { AppError } from '@felops/core/errors'
import { requireWorkspaceMemberApi } from '@/lib/workspace'

const bodySchema = z.object({ workspaceSlug: z.string().min(1) })

export async function POST(
  request: Request,
  { params }: { params: Promise<{ runId: string }> },
) {
  const { runId } = await params
  const parsed = bodySchema.safeParse(await request.json().catch(() => ({})))
  if (!parsed.success) return Response.json({ error: 'invalid_body' }, { status: 400 })

  const membership = await requireWorkspaceMemberApi(parsed.data.workspaceSlug)
  if (!membership) return Response.json({ error: 'forbidden' }, { status: 403 })

  try {
    const run = await rejectActionRun({
      workspaceId: membership.workspace.id,
      runId,
      userId: membership.user.id,
    })
    return Response.json({ run })
  } catch (error) {
    if (error instanceof AppError) {
      return Response.json({ error: error.code }, { status: error.status })
    }
    return Response.json({ error: 'internal_error' }, { status: 500 })
  }
}
