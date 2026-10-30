'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { ForbiddenError } from '@felops/core/errors'
import { changeMemberRole, inviteMember, removeMember, revokeInvitation } from '@felops/core/members'
import { updateWorkspace } from '@felops/core/workspaces'
import { requireWorkspaceMember } from '@/lib/workspace'

async function requireAdmin(slug: string) {
  const ctx = await requireWorkspaceMember(slug)
  if (ctx.role !== 'owner' && ctx.role !== 'admin') {
    redirect(`/w/${ctx.workspace.slug}/settings?error=forbidden`)
  }
  return ctx
}

export async function updateWorkspaceAction(formData: FormData) {
  const workspaceSlug = String(formData.get('workspaceSlug') ?? '')
  const { workspace } = await requireAdmin(workspaceSlug)
  const parsed = z
    .object({
      name: z.string().trim().min(2).max(80),
      slug: z
        .string()
        .trim()
        .min(2)
        .max(60)
        .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    })
    .safeParse({ name: formData.get('name'), slug: formData.get('slug') })
  if (!parsed.success) redirect(`/w/${workspace.slug}/settings?error=invalid`)

  try {
    const updated = await updateWorkspace({
      workspaceId: workspace.id,
      name: parsed.data.name,
      slug: parsed.data.slug,
    })
    revalidatePath(`/w/${updated.slug}/settings`)
    redirect(`/w/${updated.slug}/settings?saved=1`)
  } catch {
    redirect(`/w/${workspace.slug}/settings?error=slug_taken`)
  }
}

export async function inviteMemberAction(formData: FormData) {
  const workspaceSlug = String(formData.get('workspaceSlug') ?? '')
  const { workspace, user } = await requireAdmin(workspaceSlug)
  const parsed = z
    .object({
      email: z.string().email(),
      role: z.enum(['owner', 'admin', 'member']),
    })
    .safeParse({ email: formData.get('email'), role: formData.get('role') })
  if (!parsed.success) redirect(`/w/${workspace.slug}/settings?error=invite`)

  try {
    const { url } = await inviteMember({
      workspaceId: workspace.id,
      email: parsed.data.email,
      role: parsed.data.role,
      invitedBy: user.id,
    })
    revalidatePath(`/w/${workspace.slug}/settings`)
    redirect(`/w/${workspace.slug}/settings?invited=${encodeURIComponent(url)}`)
  } catch (error) {
    if (error instanceof ForbiddenError) {
      redirect(`/w/${workspace.slug}/settings?error=forbidden`)
    }
    throw error
  }
}

export async function changeRoleAction(formData: FormData) {
  const workspaceSlug = String(formData.get('workspaceSlug') ?? '')
  const { workspace, user } = await requireAdmin(workspaceSlug)
  const targetUserId = String(formData.get('userId') ?? '')
  const role = String(formData.get('role') ?? 'member') as 'owner' | 'admin' | 'member'
  try {
    await changeMemberRole({
      workspaceId: workspace.id,
      targetUserId,
      role,
      actorId: user.id,
    })
  } catch {
    redirect(`/w/${workspace.slug}/settings?error=last_owner`)
  }
  revalidatePath(`/w/${workspace.slug}/settings`)
  redirect(`/w/${workspace.slug}/settings?saved=1`)
}

export async function removeMemberAction(formData: FormData) {
  const workspaceSlug = String(formData.get('workspaceSlug') ?? '')
  const { workspace, user } = await requireAdmin(workspaceSlug)
  const targetUserId = String(formData.get('userId') ?? '')
  try {
    await removeMember({
      workspaceId: workspace.id,
      targetUserId,
      actorId: user.id,
    })
  } catch {
    redirect(`/w/${workspace.slug}/settings?error=last_owner`)
  }
  revalidatePath(`/w/${workspace.slug}/settings`)
  redirect(`/w/${workspace.slug}/settings?saved=1`)
}

export async function revokeInviteAction(formData: FormData) {
  const workspaceSlug = String(formData.get('workspaceSlug') ?? '')
  const { workspace, user } = await requireAdmin(workspaceSlug)
  const invitationId = String(formData.get('invitationId') ?? '')
  await revokeInvitation({ workspaceId: workspace.id, invitationId, userId: user.id })
  revalidatePath(`/w/${workspace.slug}/settings`)
  redirect(`/w/${workspace.slug}/settings?saved=1`)
}
