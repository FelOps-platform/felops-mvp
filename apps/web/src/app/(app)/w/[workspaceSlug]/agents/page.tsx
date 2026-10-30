import Link from 'next/link'
import { and, eq, sql } from 'drizzle-orm'
import { agent, db, knowledgeSource } from '@felops/db'
import { listAgents } from '@felops/db/repositories/agents'
import { requireWorkspaceMember } from '@/lib/workspace'
import { formatRelativeTime } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardBody } from '@/components/ui/card'
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table'
import { AgentStatusBadge } from '@/components/agents/agent-status-badge'

export default async function AgentsPage({
  params,
}: {
  params: Promise<{ workspaceSlug: string }>
}) {
  const { workspaceSlug } = await params
  const { workspace } = await requireWorkspaceMember(workspaceSlug)
  const agents = await listAgents(workspace.id)

  const counts = await db
    .select({
      agentId: knowledgeSource.agentId,
      count: sql<number>`count(*)::int`,
    })
    .from(knowledgeSource)
    .where(and(eq(knowledgeSource.workspaceId, workspace.id), eq(knowledgeSource.status, 'ready')))
    .groupBy(knowledgeSource.agentId)
  const countByAgent = new Map(counts.map((row) => [row.agentId, row.count]))

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">Agents</h1>
          <p className="mt-1 text-sm text-neutral-600">
            One agent per job. Activate only after it has ready knowledge.
          </p>
        </div>
        <Link href={`/w/${workspace.slug}/agents/new`}>
          <Button>New agent</Button>
        </Link>
      </div>

      <Card>
        <CardBody className="p-0">
          {agents.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <p className="text-sm font-medium text-neutral-900">No agents yet</p>
              <p className="mt-1 text-sm text-neutral-500">
                Create the first agent, give it a greeting, and add a source.
              </p>
            </div>
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Agent</TH>
                  <TH>Status</TH>
                  <TH>Language</TH>
                  <TH>Ready sources</TH>
                  <TH>Created</TH>
                </TR>
              </THead>
              <TBody>
                {agents.map((item) => (
                  <TR key={item.id}>
                    <TD>
                      <Link
                        href={`/w/${workspace.slug}/agents/${item.id}`}
                        className="font-medium text-neutral-900 hover:text-[#FA6400]"
                      >
                        {item.name}
                      </Link>
                      <p className="text-xs text-neutral-500">/{item.slug}</p>
                    </TD>
                    <TD>
                      <AgentStatusBadge status={item.status} />
                    </TD>
                    <TD className="text-sm">{item.language}</TD>
                    <TD>{countByAgent.get(item.id) ?? 0}</TD>
                    <TD className="text-xs text-neutral-500">{formatRelativeTime(item.createdAt)}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </CardBody>
      </Card>
    </div>
  )
}
