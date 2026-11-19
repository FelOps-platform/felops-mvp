import Link from 'next/link'
import { listUserWorkspaces } from '@felops/core/workspaces'
import { requireSessionUser } from '@/lib/workspace'
import { Brand } from '@/components/brand'
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
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#F7F7F8] px-5 py-14">
      <div className="w-full max-w-[440px]">
        <div className="mb-8 flex justify-center">
          <Brand />
        </div>
        <div className="rounded-lg border border-[#E5E7EB] bg-white p-7 sm:p-8">
          <h1 className="text-[24px] font-semibold tracking-[-0.02em] text-[#111827]">
            Create your workspace
          </h1>
          <p className="mt-1.5 text-sm leading-6 text-[#6B7280]">
            A workspace holds your agents, knowledge, conversations, and approvals. You can invite
            your team after it exists.
          </p>
          {params.error === 'slug_taken' ? (
            <p className="mt-4 rounded-md border border-[#FECACA] bg-[#FEF2F2] px-3 py-2 text-sm text-[#B91C1C]">
              That workspace URL is already taken. Try another.
            </p>
          ) : null}
          {params.error === 'invalid' ? (
            <p className="mt-4 rounded-md border border-[#FECACA] bg-[#FEF2F2] px-3 py-2 text-sm text-[#B91C1C]">
              Check the name and URL. Use lowercase letters, numbers, and dashes.
            </p>
          ) : null}
          <div className="mt-6">
            <WorkspaceForm action={createWorkspaceAction} />
          </div>
        </div>

        {workspaces.length > 0 ? (
          <div className="mt-8">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#9CA3AF]">
              Your workspaces
            </p>
            <ul className="mt-3 space-y-2">
              {workspaces.map((workspace) => (
                <li key={workspace.id}>
                  <Link
                    href={`/w/${workspace.slug}`}
                    className="flex items-center justify-between rounded-md border border-[#E5E7EB] bg-white px-4 py-3 text-sm transition-colors hover:bg-[#F9FAFB]"
                  >
                    <span className="font-medium text-[#111827]">{workspace.name}</span>
                    <span className="text-[#9CA3AF]">/w/{workspace.slug}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </main>
  )
}
