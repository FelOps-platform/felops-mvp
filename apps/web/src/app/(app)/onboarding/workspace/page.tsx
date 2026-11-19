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
    <main className="auth-ambient relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-5 py-14 text-white">
      <div className="relative z-10 w-full max-w-[460px]">
        <div className="mb-8 flex justify-center">
          <Brand />
        </div>
        <div className="rounded-2xl border border-white/[0.12] bg-[#0B0B0F]/90 p-7 shadow-[0_24px_80px_-20px_rgba(0,0,0,0.9)] backdrop-blur sm:p-8">
          <h1 className="text-[26px] font-semibold tracking-[-0.02em] text-white">
            Create your workspace
          </h1>
          <p className="mt-2 text-sm leading-6 text-white/50">
            A workspace holds your agents, knowledge, conversations, and approvals. You can invite
            your team after it exists.
          </p>
          {params.error === 'slug_taken' ? (
            <p className="mt-4 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-200">
              That workspace URL is already taken. Try another.
            </p>
          ) : null}
          {params.error === 'invalid' ? (
            <p className="mt-4 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-200">
              Check the name and URL. Use lowercase letters, numbers, and dashes.
            </p>
          ) : null}
          <div className="mt-6">
            <WorkspaceForm action={createWorkspaceAction} />
          </div>
        </div>

        {workspaces.length > 0 ? (
          <div className="mt-8">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/35">
              Your workspaces
            </p>
            <ul className="mt-3 space-y-2">
              {workspaces.map((workspace) => (
                <li key={workspace.id}>
                  <Link
                    href={`/w/${workspace.slug}`}
                    className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm transition-colors hover:bg-white/[0.07]"
                  >
                    <span className="font-medium text-white">{workspace.name}</span>
                    <span className="text-white/40">/w/{workspace.slug}</span>
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
