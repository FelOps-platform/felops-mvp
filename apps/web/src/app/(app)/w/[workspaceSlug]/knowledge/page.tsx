import Link from 'next/link'
import { desc, eq, sql } from 'drizzle-orm'
import { agent, db, knowledgeSource } from '@felops/db'
import { requireWorkspaceMember } from '@/lib/workspace'
import { formatRelativeTime } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardBody } from '@/components/ui/card'
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table'
import { PageHeader } from '@/components/app-shell/page-header'
import { FileText, Globe, Type } from 'lucide-react'

const typeLabel: Record<string, string> = {
  url: 'Website',
  pdf: 'PDF',
  docx: 'DOCX',
  txt: 'Text file',
  text: 'Text',
}

function statusTone(status: string): 'success' | 'warning' | 'danger' | 'neutral' {
  if (status === 'ready') return 'success'
  if (status === 'failed') return 'danger'
  if (status === 'processing') return 'warning'
  return 'neutral'
}

function SourceIcon({ type }: { type: string }) {
  const Icon = type === 'url' ? Globe : type === 'text' ? Type : FileText
  return (
    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-neutral-100 text-neutral-500">
      <Icon className="h-4 w-4" />
    </span>
  )
}

export default async function KnowledgePage({
  params,
}: {
  params: Promise<{ workspaceSlug: string }>
}) {
  const { workspaceSlug } = await params
  const { workspace } = await requireWorkspaceMember(workspaceSlug)

  const [sources, agentRows, counts] = await Promise.all([
    db
      .select({ source: knowledgeSource, agentName: agent.name })
      .from(knowledgeSource)
      .innerJoin(agent, eq(knowledgeSource.agentId, agent.id))
      .where(eq(knowledgeSource.workspaceId, workspace.id))
      .orderBy(desc(knowledgeSource.createdAt))
      .limit(100),
    db.select().from(agent).where(eq(agent.workspaceId, workspace.id)).orderBy(agent.createdAt),
    db
      .select({ status: knowledgeSource.status, count: sql<number>`count(*)::int` })
      .from(knowledgeSource)
      .where(eq(knowledgeSource.workspaceId, workspace.id))
      .groupBy(knowledgeSource.status),
  ])

  const countByStatus = new Map(counts.map((row) => [row.status, row.count]))
  const total = counts.reduce((sum, row) => sum + row.count, 0)
  const ready = countByStatus.get('ready') ?? 0
  const processing = countByStatus.get('processing') ?? 0
  const failed = countByStatus.get('failed') ?? 0
  const addHref =
    agentRows.length === 1
      ? `/w/${workspace.slug}/agents/${agentRows[0].id}/knowledge`
      : agentRows.length === 0
        ? `/w/${workspace.slug}/agents/new`
        : `/w/${workspace.slug}/agents`
  const addLabel =
    agentRows.length === 1
      ? `Add to ${agentRows[0].name}`
      : agentRows.length === 0
        ? 'Create an agent'
        : 'Choose an agent'

  const stats = [
    { label: 'Total sources', value: total, tone: 'bg-[#8A8A8A]' },
    { label: 'Ready', value: ready, tone: 'bg-[#00BE3F]' },
    { label: 'Processing', value: processing, tone: 'bg-[#F2B200]' },
    { label: 'Failed', value: failed, tone: 'bg-[#C10101]' },
  ]

  return (
    <div className="space-y-7">
      <PageHeader
        title="Knowledge"
        description="Everything your agents can cite. Sources are scoped to the agent that owns them."
        actions={
          <Link href={addHref}>
            <Button>{addLabel}</Button>
          </Link>
        }
      />

      <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardBody className="p-5">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-500">
                  {stat.label}
                </p>
                <span className={`h-2 w-2 rounded-full ${stat.tone}`} />
              </div>
              <p className="mt-4 text-[30px] font-semibold leading-none tracking-[-0.03em] text-neutral-900">
                {stat.value}
              </p>
            </CardBody>
          </Card>
        ))}
      </div>

      <Card>
        <CardBody className="p-0">
          {sources.length === 0 ? (
            <div className="px-6 py-14 text-center">
              <p className="text-sm font-medium text-neutral-900">No knowledge yet</p>
              <p className="mx-auto mt-1 max-w-sm text-sm leading-6 text-neutral-500">
                Add a website, a PDF, or a text snippet to an agent. Answers stay grounded in what
                you add here.
              </p>
              <Link href={addHref} className="mt-4 inline-block">
                <Button size="sm">{addLabel}</Button>
              </Link>
            </div>
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH className="pl-5">Source</TH>
                  <TH>Agent</TH>
                  <TH>Type</TH>
                  <TH>Status</TH>
                  <TH>Chunks</TH>
                  <TH>Updated</TH>
                </TR>
              </THead>
              <TBody>
                {sources.map(({ source, agentName }) => (
                  <TR key={source.id}>
                    <TD className="pl-5">
                      <Link
                        href={`/w/${workspace.slug}/agents/${source.agentId}/knowledge`}
                        className="flex items-center gap-3"
                      >
                        <SourceIcon type={source.type} />
                        <span className="min-w-0">
                          <span className="block truncate font-medium text-neutral-900">
                            {source.title}
                          </span>
                          {source.url ? (
                            <span className="block max-w-[280px] truncate text-[11px] text-neutral-400">
                              {source.url}
                            </span>
                          ) : null}
                        </span>
                      </Link>
                    </TD>
                    <TD className="text-sm text-neutral-600">{agentName}</TD>
                    <TD className="text-sm text-neutral-600">
                      {typeLabel[source.type] ?? source.type}
                    </TD>
                    <TD>
                      <Badge tone={statusTone(source.status)}>{source.status}</Badge>
                    </TD>
                    <TD className="text-sm tabular-nums text-neutral-600">{source.chunkCount}</TD>
                    <TD className="text-xs text-neutral-500">
                      {formatRelativeTime(source.updatedAt)}
                    </TD>
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
