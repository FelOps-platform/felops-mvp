import 'server-only'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { assertMembership } from '@felops/core/workspaces'
import { UnauthorizedError } from '@felops/core/errors'
import type { Workspace, WorkspaceRole } from '@felops/db/schema'
import { auth } from './auth'

export type SessionUser = {
  id: string
  name: string
  email: string
  image?: string | null
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return null
  return {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
    image: session.user.image ?? null,
  }
}

export async function requireSessionUser(): Promise<SessionUser> {
  const user = await getSessionUser()
  if (!user) redirect('/sign-in')
  return user
}

export async function requireWorkspaceMember(
  slug: string,
): Promise<{ workspace: Workspace; role: WorkspaceRole; user: SessionUser }> {
  const user = await getSessionUser()
  if (!user) redirect('/sign-in')
  try {
    const membership = await assertMembership({ userId: user.id, workspaceSlug: slug })
    return { ...membership, user }
  } catch (error) {
    if (error instanceof UnauthorizedError) redirect('/sign-in')
    redirect('/onboarding/workspace?error=forbidden')
  }
}

export async function requireWorkspaceMemberApi(slug: string) {
  const user = await getSessionUser()
  if (!user) return null
  try {
    const membership = await assertMembership({ userId: user.id, workspaceSlug: slug })
    return { ...membership, user }
  } catch {
    return null
  }
}
