import { notFound } from 'next/navigation'
import { findAgent } from '@felops/db/repositories/agents'
import { requireWorkspaceMember } from '@/lib/workspace'
import { Playground } from '@/components/agents/playground'

export default async function PlaygroundPage({
  params,
}: {
  params: Promise<{ workspaceSlug: string; agentId: string }>
}) {
  const { workspaceSlug, agentId } = await params
  const { workspace } = await requireWorkspaceMember(workspaceSlug)
  const agent = await findAgent({ workspaceId: workspace.id, agentId })
  if (!agent) notFound()

  return (
    <div className="mx-auto max-w-3xl">
      <Playground
        workspaceSlug={workspace.slug}
        agentId={agent.id}
        greeting={agent.greeting}
      />
    </div>
  )
}
