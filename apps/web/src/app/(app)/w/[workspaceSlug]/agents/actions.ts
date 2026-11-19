'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import {
  activateAgent,
  createAgent,
  deleteAgent,
  pauseAgent,
  updateAgent,
} from '@felops/core/agents'
import { NoReadyKnowledgeError } from '@felops/core/agents/types'
import { requireWorkspaceMember } from '@/lib/workspace'

const instructionsSchema = z.object({
  role: z.string().max(2000).default(''),
  language: z.enum(['auto', 'ar', 'en', 'ar+en']).default('ar+en'),
  constraints: z.string().max(4000).default(''),
  responseFormat: z.string().max(2000).default(''),
})

const createSchema = z.object({
  name: z.string().trim().min(2).max(80),
  greeting: z.string().trim().max(500).default(''),
  instructions: instructionsSchema,
})

const updateSchema = z.object({
  name: z.string().trim().min(2).max(80),
  greeting: z.string().trim().max(500),
  instructions: instructionsSchema,
})

function readInstructions(formData: FormData) {
  return {
    role: String(formData.get('role') ?? ''),
    language: String(formData.get('language') ?? 'ar+en'),
    constraints: String(formData.get('constraints') ?? ''),
    responseFormat: String(formData.get('responseFormat') ?? ''),
  }
}

export async function createAgentAction(formData: FormData) {
  const workspaceSlug = String(formData.get('workspaceSlug') ?? '')
  const { workspace } = await requireWorkspaceMember(workspaceSlug)
  const parsed = createSchema.safeParse({
    name: formData.get('name'),
    greeting: formData.get('greeting') ?? '',
    instructions: readInstructions(formData),
  })
  if (!parsed.success) {
    redirect(`/w/${workspace.slug}/agents/new?error=invalid`)
  }
  const created = await createAgent({
    workspaceId: workspace.id,
    name: parsed.data.name,
    greeting: parsed.data.greeting,
    instructions: parsed.data.instructions,
  })
  revalidatePath(`/w/${workspace.slug}/agents`)
  redirect(`/w/${workspace.slug}/agents/${created.id}`)
}

export async function updateAgentAction(formData: FormData) {
  const workspaceSlug = String(formData.get('workspaceSlug') ?? '')
  const agentId = String(formData.get('agentId') ?? '')
  const { workspace } = await requireWorkspaceMember(workspaceSlug)
  const parsed = updateSchema.safeParse({
    name: formData.get('name'),
    greeting: formData.get('greeting') ?? '',
    instructions: readInstructions(formData),
  })
  if (!parsed.success) {
    redirect(`/w/${workspace.slug}/agents/${agentId}?error=invalid`)
  }
  await updateAgent({
    workspaceId: workspace.id,
    agentId,
    patch: {
      name: parsed.data.name,
      greeting: parsed.data.greeting,
      instructions: parsed.data.instructions,
      language: parsed.data.instructions.language,
    },
  })
  revalidatePath(`/w/${workspace.slug}/agents/${agentId}`)
  redirect(`/w/${workspace.slug}/agents/${agentId}?saved=1`)
}

export async function activateAgentAction(formData: FormData) {
  const workspaceSlug = String(formData.get('workspaceSlug') ?? '')
  const agentId = String(formData.get('agentId') ?? '')
  const { workspace } = await requireWorkspaceMember(workspaceSlug)
  try {
    await activateAgent({ workspaceId: workspace.id, agentId })
  } catch (error) {
    if (error instanceof NoReadyKnowledgeError) {
      redirect(`/w/${workspace.slug}/agents/${agentId}?error=knowledge`)
    }
    throw error
  }
  revalidatePath(`/w/${workspace.slug}/agents/${agentId}`)
  redirect(`/w/${workspace.slug}/agents/${agentId}?activated=1`)
}

export async function pauseAgentAction(formData: FormData) {
  const workspaceSlug = String(formData.get('workspaceSlug') ?? '')
  const agentId = String(formData.get('agentId') ?? '')
  const { workspace } = await requireWorkspaceMember(workspaceSlug)
  await pauseAgent({ workspaceId: workspace.id, agentId })
  revalidatePath(`/w/${workspace.slug}/agents/${agentId}`)
  redirect(`/w/${workspace.slug}/agents/${agentId}?paused=1`)
}

export async function deleteAgentAction(formData: FormData) {
  const workspaceSlug = String(formData.get('workspaceSlug') ?? '')
  const agentId = String(formData.get('agentId') ?? '')
  const { workspace } = await requireWorkspaceMember(workspaceSlug)
  await deleteAgent({ workspaceId: workspace.id, agentId })
  revalidatePath(`/w/${workspace.slug}/agents`)
  redirect(`/w/${workspace.slug}/agents`)
}
