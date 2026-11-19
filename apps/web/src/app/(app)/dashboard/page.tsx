import { redirect } from 'next/navigation'
import { listUserWorkspaces } from '@felops/core/workspaces'
import { requireSessionUser } from '@/lib/workspace'

export default async function DashboardRedirect() {
  const user = await requireSessionUser()
  const workspaces = await listUserWorkspaces(user.id)
  if (workspaces.length === 0) redirect('/onboarding/workspace')
  redirect(`/w/${workspaces[0].slug}`)
}
