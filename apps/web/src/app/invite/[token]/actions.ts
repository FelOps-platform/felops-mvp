'use server'

import { redirect } from 'next/navigation'
import { acceptInvitation } from '@felops/core/members'
import { InviteExpiredError } from '@felops/core/errors'
import { getSessionUser } from '@/lib/workspace'

export async function acceptInvitationAction(formData: FormData) {
  const token = String(formData.get('token') ?? '')
  const user = await getSessionUser()
  if (!user) redirect(`/sign-in?invite=${encodeURIComponent(token)}`)
  try {
    const workspace = await acceptInvitation(token, user.id)
    redirect(`/w/${workspace.slug}`)
  } catch (error) {
    if (error instanceof InviteExpiredError) {
      redirect(`/invite/${token}?error=expired`)
    }
    throw error
  }
}
