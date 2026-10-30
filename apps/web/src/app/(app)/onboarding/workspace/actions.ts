'use server'

import { redirect } from 'next/navigation'
import { z } from 'zod'
import { createWorkspace } from '@felops/core/workspaces'
import { SlugTakenError } from '@felops/core/errors'
import { requireSessionUser } from '@/lib/workspace'

const schema = z.object({
  name: z.string().trim().min(2).max(80),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(60)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase letters, numbers, and dashes'),
})

export async function createWorkspaceAction(formData: FormData) {
  const user = await requireSessionUser()
  const parsed = schema.safeParse({
    name: formData.get('name'),
    slug: formData.get('slug'),
  })
  if (!parsed.success) {
    redirect('/onboarding/workspace?error=invalid')
  }

  try {
    const workspace = await createWorkspace({
      userId: user.id,
      name: parsed.data.name,
      slug: parsed.data.slug,
    })
    redirect(`/w/${workspace.slug}`)
  } catch (error) {
    if (error instanceof SlugTakenError) {
      redirect('/onboarding/workspace?error=slug_taken')
    }
    throw error
  }
}
