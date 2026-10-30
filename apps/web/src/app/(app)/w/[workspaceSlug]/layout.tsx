import { listUserWorkspaces } from '@felops/core/workspaces'
import { requireWorkspaceMember } from '@/lib/workspace'
import { WorkspaceNav } from '@/components/workspace-nav'
import { WorkspaceSwitcher } from '@/components/workspace-switcher'
import { SignOutButton } from '@/components/sign-out-button'

export default async function WorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ workspaceSlug: string }>
}) {
  const { workspaceSlug } = await params
  const { workspace, role, user } = await requireWorkspaceMember(workspaceSlug)
  const workspaces = await listUserWorkspaces(user.id)

  return (
    <div className="min-h-screen">
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2 text-sm font-bold tracking-wide text-neutral-900">
            <span className="h-2 w-2 rounded-full bg-[#FA6400]" />
            FELOPS
          </div>
          <span className="hidden text-neutral-300 sm:inline">/</span>
          <WorkspaceSwitcher current={workspace} workspaces={workspaces} />
          <div className="ml-auto flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-xs font-medium text-neutral-900">{user.name}</p>
              <p className="text-[11px] text-neutral-500">
                {role} · {workspace.plan}
              </p>
            </div>
            <SignOutButton />
          </div>
        </div>
        <div className="mx-auto max-w-7xl px-4 pb-2 sm:px-6">
          <WorkspaceNav slug={workspace.slug} />
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  )
}
