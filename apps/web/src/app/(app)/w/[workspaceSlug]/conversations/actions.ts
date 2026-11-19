'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import {
  addHumanMessage,
  closeConversation,
  takeOver,
} from '@felops/core/conversations'
import { requireWorkspaceMember } from '@/lib/workspace'

export async function takeOverAction(formData: FormData) {
  const workspaceSlug = String(formData.get('workspaceSlug') ?? '')
  const conversationId = String(formData.get('conversationId') ?? '')
  const { workspace, user } = await requireWorkspaceMember(workspaceSlug)
  await takeOver({ workspaceId: workspace.id, conversationId, userId: user.id })
  revalidatePath(`/w/${workspace.slug}/conversations/${conversationId}`)
  redirect(`/w/${workspace.slug}/conversations/${conversationId}`)
}

export async function closeConversationAction(formData: FormData) {
  const workspaceSlug = String(formData.get('workspaceSlug') ?? '')
  const conversationId = String(formData.get('conversationId') ?? '')
  const { workspace } = await requireWorkspaceMember(workspaceSlug)
  await closeConversation({ workspaceId: workspace.id, conversationId })
  revalidatePath(`/w/${workspace.slug}/conversations/${conversationId}`)
  redirect(`/w/${workspace.slug}/conversations/${conversationId}`)
}

export async function replyAction(formData: FormData) {
  const workspaceSlug = String(formData.get('workspaceSlug') ?? '')
  const conversationId = String(formData.get('conversationId') ?? '')
  const content = String(formData.get('content') ?? '').trim()
  const { workspace } = await requireWorkspaceMember(workspaceSlug)
  if (content) {
    await addHumanMessage({ workspaceId: workspace.id, conversationId, content })
  }
  revalidatePath(`/w/${workspace.slug}/conversations/${conversationId}`)
  redirect(`/w/${workspace.slug}/conversations/${conversationId}`)
}
