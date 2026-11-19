'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { addSource, deleteSource, retrySource } from '@felops/core/knowledge'
import { assertSafePublicUrl } from '@felops/core/knowledge/url-safety'
import { findAgent } from '@felops/db/repositories/agents'
import { requireWorkspaceMember } from '@/lib/workspace'

const urlSchema = z.object({
  title: z.string().trim().min(1).max(200),
  url: z.string().url(),
})

const textSchema = z.object({
  title: z.string().trim().min(1).max(200),
  rawText: z.string().trim().min(20).max(100_000),
})

async function context(formData: FormData) {
  const workspaceSlug = String(formData.get('workspaceSlug') ?? '')
  const agentId = String(formData.get('agentId') ?? '')
  const { workspace } = await requireWorkspaceMember(workspaceSlug)
  const agent = await findAgent({ workspaceId: workspace.id, agentId })
  if (!agent) redirect(`/w/${workspace.slug}/agents?error=not_found`)
  return { workspace, agent }
}

function back(workspaceSlug: string, agentId: string, query: string): never {
  redirect(`/w/${workspaceSlug}/agents/${agentId}/knowledge?${query}`)
}

export async function addUrlSourceAction(formData: FormData) {
  const { workspace, agent } = await context(formData)
  const parsed = urlSchema.safeParse({
    title: formData.get('title'),
    url: formData.get('url'),
  })
  if (!parsed.success) back(workspace.slug, agent.id, 'error=invalid')
  try {
    assertSafePublicUrl(parsed.data.url)
  } catch {
    back(workspace.slug, agent.id, 'error=unsafe_url')
  }
  await addSource({
    workspaceId: workspace.id,
    agentId: agent.id,
    type: 'url',
    title: parsed.data.title,
    url: parsed.data.url,
  })
  revalidatePath(`/w/${workspace.slug}/agents/${agent.id}/knowledge`)
  back(workspace.slug, agent.id, 'added=1')
}

export async function addTextSourceAction(formData: FormData) {
  const { workspace, agent } = await context(formData)
  const parsed = textSchema.safeParse({
    title: formData.get('title'),
    rawText: formData.get('rawText'),
  })
  if (!parsed.success) back(workspace.slug, agent.id, 'error=invalid')
  await addSource({
    workspaceId: workspace.id,
    agentId: agent.id,
    type: 'text',
    title: parsed.data.title,
    rawText: parsed.data.rawText,
  })
  revalidatePath(`/w/${workspace.slug}/agents/${agent.id}/knowledge`)
  back(workspace.slug, agent.id, 'added=1')
}

export async function addFileSourceAction(formData: FormData) {
  const { workspace, agent } = await context(formData)
  const storageKey = String(formData.get('storageKey') ?? '')
  const name = String(formData.get('name') ?? 'Uploaded file')
  const mime = String(formData.get('mime') ?? '')
  if (!storageKey) back(workspace.slug, agent.id, 'error=invalid')
  const type =
    mime === 'application/pdf'
      ? 'pdf'
      : mime.includes('wordprocessingml')
        ? 'docx'
        : 'txt'
  await addSource({
    workspaceId: workspace.id,
    agentId: agent.id,
    type,
    title: name,
    storageKey,
  })
  revalidatePath(`/w/${workspace.slug}/agents/${agent.id}/knowledge`)
  back(workspace.slug, agent.id, 'added=1')
}

export async function retrySourceAction(formData: FormData) {
  const { workspace, agent } = await context(formData)
  const sourceId = String(formData.get('sourceId') ?? '')
  await retrySource({ workspaceId: workspace.id, sourceId })
  revalidatePath(`/w/${workspace.slug}/agents/${agent.id}/knowledge`)
  back(workspace.slug, agent.id, 'retried=1')
}

export async function deleteSourceAction(formData: FormData) {
  const { workspace, agent } = await context(formData)
  const sourceId = String(formData.get('sourceId') ?? '')
  await deleteSource({ workspaceId: workspace.id, sourceId })
  revalidatePath(`/w/${workspace.slug}/agents/${agent.id}/knowledge`)
  back(workspace.slug, agent.id, 'deleted=1')
}
