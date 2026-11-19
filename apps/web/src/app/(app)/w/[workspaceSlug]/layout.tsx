import { listUserWorkspaces } from '@felops/core/workspaces'
import { requireWorkspaceMember } from '@/lib/workspace'
import { AppSidebar } from '@/components/app-shell/sidebar'

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
    <div className="min-h-screen bg-[#08080A] text-white">
      <AppSidebar
        workspace={workspace}
        workspaces={workspaces}
        user={{ name: user.name, email: user.email }}
        role={role}
      />
      <main className="min-h-screen pt-16 lg:pl-[264px]">
        <div className="mx-auto w-full max-w-[1440px] px-5 py-7 sm:px-8 lg:px-10 lg:py-10">
          {children}
        </div>
      </main>
    </div>
  )
}
