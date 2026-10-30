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
            className="text-xs font-medium text-neutral-500 hover:text-neutral-900"
          >
            ← Agents
          </Link>
          <div className="mt-2 flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">{agent.name}</h1>
            <AgentStatusBadge status={agent.status} />
          </div>
          <p className="mt-1 text-sm text-neutral-500">
            {workspace.name} · /{agent.slug}
          </p>
        </div>
      </div>
      <AgentNav slug={workspace.slug} agentId={agent.id} />
      {children}
    </div>
  )
}
