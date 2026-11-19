'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import {
  createAction,
  deleteAction,
  requestActionRun,
  updateAction,
} from '@felops/core/actions'
import { findAgent } from '@felops/db/repositories/agents'
import { requireWorkspaceMember } from '@/lib/workspace'

function parseJson(value: FormDataEntryValue | null, fallback: unknown) {
  if (!value || String(value).trim() === '') return fallback
  return JSON.parse(String(value))
}

async function context(formData: FormData) {
  const workspaceSlug = String(formData.get('workspaceSlug') ?? '')
  const agentId = String(formData.get('agentId') ?? '')
  const { workspace } = await requireWorkspaceMember(workspaceSlug)
  const agent = await findAgent({ workspaceId: workspace.id, agentId })
  if (!agent) redirect(`/w/${workspace.slug}/agents?error=not_found`)
  return { workspace, agent }
}

function back(slug: string, agentId: string, query: string): never {
  redirect(`/w/${slug}/agents/${agentId}/actions?${query}`)
}

const actionSchema = z.object({
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(500).default(''),
  method: z.enum(['GET', 'POST']),
  urlTemplate: z.string().url(),
  bodyTemplate: z.string().max(4000).optional(),
  approvalRequired: z.boolean(),
  enabled: z.boolean(),
})

export async function createActionAction(formData: FormData) {
  const { workspace, agent } = await context(formData)
  const parsed = actionSchema.safeParse({
    name: formData.get('name'),
    description: formData.get('description') ?? '',
    method: formData.get('method'),
    urlTemplate: formData.get('urlTemplate'),
    bodyTemplate: String(formData.get('bodyTemplate') ?? '') || undefined,
    approvalRequired: formData.get('approvalRequired') === 'on',
    enabled: formData.get('enabled') !== 'off',
  })
  if (!parsed.success) back(workspace.slug, agent.id, 'error=invalid')

  let parameters: Record<string, unknown> = {}
  let headers: Record<string, string> | undefined
  try {
    parameters = parseJson(formData.get('parameters'), {}) as Record<string, unknown>
    const rawHeaders = parseJson(formData.get('headers'), {}) as Record<string, string>
    headers = Object.keys(rawHeaders).length > 0 ? rawHeaders : undefined
  } catch {
    back(workspace.slug, agent.id, 'error=json')
  }

  try {
    await createAction({
      workspaceId: workspace.id,
      agentId: agent.id,
      name: parsed.data.name,
      description: parsed.data.description,
      method: parsed.data.method,
      urlTemplate: parsed.data.urlTemplate,
      bodyTemplate: parsed.data.bodyTemplate ?? null,
      parameters,
      headers,
      approvalRequired: parsed.data.approvalRequired,
      enabled: parsed.data.enabled,
    })
  } catch (error) {
    if (error instanceof Error && error.message.includes('Invalid URL')) {
      back(workspace.slug, agent.id, 'error=unsafe_url')
    }
    back(workspace.slug, agent.id, 'error=unsafe_url')
  }
  revalidatePath(`/w/${workspace.slug}/agents/${agent.id}/actions`)
  back(workspace.slug, agent.id, 'created=1')
}

export async function toggleActionAction(formData: FormData) {
  const { workspace, agent } = await context(formData)
  const actionId = String(formData.get('actionId') ?? '')
  const enabled = formData.get('enabled') === 'true'
  await updateAction({
    workspaceId: workspace.id,
    actionId,
    patch: { enabled },
  })
  revalidatePath(`/w/${workspace.slug}/agents/${agent.id}/actions`)
  back(workspace.slug, agent.id, 'updated=1')
}

export async function deleteActionAction(formData: FormData) {
  const { workspace, agent } = await context(formData)
  const actionId = String(formData.get('actionId') ?? '')
  await deleteAction({ workspaceId: workspace.id, actionId })
  revalidatePath(`/w/${workspace.slug}/agents/${agent.id}/actions`)
  back(workspace.slug, agent.id, 'deleted=1')
}

export async function testActionAction(formData: FormData) {
  const { workspace, agent } = await context(formData)
  const actionId = String(formData.get('actionId') ?? '')
  let args: Record<string, unknown> = {}
  try {
    args = parseJson(formData.get('args'), {}) as Record<string, unknown>
  } catch {
    back(workspace.slug, agent.id, 'error=json')
  }
  await requestActionRun({
    workspaceId: workspace.id,
    agentId: agent.id,
    actionId,
    args,
  })
  revalidatePath(`/w/${workspace.slug}/approvals`)
  redirect(`/w/${workspace.slug}/approvals?tested=1`)
}
