import Link from 'next/link'
import { notFound } from 'next/navigation'
import { findAgent } from '@felops/db/repositories/agents'
import { requireWorkspaceMember } from '@/lib/workspace'
import { AgentNav } from '@/components/agents/agent-nav'
import { AgentStatusBadge } from '@/components/agents/agent-status-badge'

export default async function AgentLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ workspaceSlug: string; agentId: string }>
}) {
  const { workspaceSlug, agentId } = await params
  const { workspace } = await requireWorkspaceMember(workspaceSlug)
  const agent = await findAgent({ workspaceId: workspace.id, agentId })
  if (!agent) notFound()

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href={`/w/${workspace.slug}/agents`}
            className="text-xs font-medium text-[#6B7280] transition-colors hover:text-[#111827]"
          >
            ← Agents
          </Link>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <h1 className="text-[24px] font-semibold tracking-[-0.02em] text-[#111827] sm:text-[28px]">
              {agent.name}
            </h1>
            <AgentStatusBadge status={agent.status} />
          </div>
          <p className="mt-1 text-sm text-[#6B7280]">
            {workspace.name} · /{agent.slug}
          </p>
        </div>
        <Link
          href={`/w/${workspace.slug}/agents/${agent.id}/playground`}
          className="inline-flex h-9 items-center justify-center rounded-md border border-[#D1D5DB] bg-white px-3.5 text-[13px] font-medium text-[#374151] transition-colors hover:bg-[#F9FAFB]"
        >
          Open playground
        </Link>
      </div>
      <AgentNav slug={workspace.slug} agentId={agent.id} />
      {children}
    </div>
  )
}
