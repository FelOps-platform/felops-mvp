import Link from 'next/link'
import { listUserWorkspaces } from '@felops/core/workspaces'
import { requireSessionUser } from '@/lib/workspace'
import { createWorkspaceAction } from './actions'
import { WorkspaceForm } from './workspace-form'

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; new?: string }>
}) {
  const user = await requireSessionUser()
  const params = await searchParams
  const workspaces = await listUserWorkspaces(user.id)

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-16">
      <div className="mb-8 flex items-center gap-2 text-sm font-semibold tracking-wide text-neutral-500">
        <span className="h-2 w-2 rounded-full bg-[#FA6400]" />
        FELOPS
      </div>
      <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
        Create your workspace
      </h1>
      <p className="mt-2 text-sm leading-6 text-neutral-600">
        A workspace holds your agents, knowledge, conversations, and approvals. You can invite your
        team after it exists.
      </p>
      {params.error === 'slug_taken' ? (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          That workspace URL is already taken. Try another.
        </p>
      ) : null}
      {params.error === 'invalid' ? (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          Check the name and URL. Use lowercase letters, numbers, and dashes.
        </p>
      ) : null}
      <div className="mt-6">
        <WorkspaceForm action={createWorkspaceAction} />
      </div>
      {workspaces.length > 0 ? (
        <div className="mt-8 border-t border-neutral-200 pt-5">
          <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
            Your workspaces
          </p>
          <ul className="mt-3 space-y-2">
            {workspaces.map((workspace) => (
              <li key={workspace.id}>
                <Link
                  href={`/w/${workspace.slug}`}
                  className="flex items-center justify-between rounded-lg border border-neutral-200 bg-white px-4 py-3 text-sm hover:bg-neutral-50"
                >
                  <span className="font-medium text-neutral-900">{workspace.name}</span>
                  <span className="text-neutral-500">/w/{workspace.slug}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </main>
  )
}
