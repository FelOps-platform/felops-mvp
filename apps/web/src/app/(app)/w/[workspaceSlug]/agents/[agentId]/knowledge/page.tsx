import { notFound } from 'next/navigation'
import { and, eq, sql } from 'drizzle-orm'
import { db, knowledgeSource } from '@felops/db'
import { findAgent } from '@felops/db/repositories/agents'
import { requireWorkspaceMember } from '@/lib/workspace'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card'
import { BuilderStepper } from '@/components/agents/builder-stepper'
import { AddSourceDialog } from '@/components/knowledge/add-source-dialog'
import { SourceList } from '@/components/knowledge/source-list'
import {
  addFileSourceAction,
  addTextSourceAction,
  addUrlSourceAction,
  deleteSourceAction,
  retrySourceAction,
} from './actions'

export default async function KnowledgePage({
  params,
  searchParams,
}: {
  params: Promise<{ workspaceSlug: string; agentId: string }>
  searchParams: Promise<{ error?: string; added?: string }>
}) {
  const { workspaceSlug, agentId } = await params
  const query = await searchParams
  const { workspace } = await requireWorkspaceMember(workspaceSlug)
  const agent = await findAgent({ workspaceId: workspace.id, agentId })
  if (!agent) notFound()

  const sources = await db
    .select()
    .from(knowledgeSource)
    .where(
      and(
        eq(knowledgeSource.workspaceId, workspace.id),
        eq(knowledgeSource.agentId, agent.id),
      ),
    )
    .orderBy(knowledgeSource.createdAt)

  const [totals] = await db
    .select({
      ready: sql<number>`count(*) filter (where status = 'ready')::int`,
      chunks: sql<number>`coalesce(sum(chunk_count), 0)::int`,
    })
    .from(knowledgeSource)
    .where(
      and(
        eq(knowledgeSource.workspaceId, workspace.id),
        eq(knowledgeSource.agentId, agent.id),
      ),
    )

  return (
    <div className="space-y-6">
      <BuilderStepper slug={workspace.slug} agentId={agent.id} active="knowledge" />

      {query.error === 'unsafe_url' ? (
        <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          That URL is not a public http(s) address. Localhost, private IPs, and metadata endpoints
          are blocked.
        </p>
      ) : null}
      {query.error === 'invalid' ? (
        <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          Check the source details and try again.
        </p>
      ) : null}
      {query.added ? (
        <p className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
          Source added. Ingestion runs in the background; refresh to see its status.
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardBody>
            <p className="text-xs uppercase tracking-wide text-neutral-500">Ready sources</p>
            <p className="mt-2 text-[28px] font-semibold tracking-[-0.03em] text-neutral-900">{totals?.ready ?? 0}</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <p className="text-xs uppercase tracking-wide text-neutral-500">Retrievable chunks</p>
            <p className="mt-2 text-[28px] font-semibold tracking-[-0.03em] text-neutral-900">{totals?.chunks ?? 0}</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <p className="text-xs uppercase tracking-wide text-neutral-500">Activation rule</p>
            <p className="mt-2 text-sm leading-6 text-neutral-700">
              At least one ready source with one or more chunks.
            </p>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle>Sources</CardTitle>
          <AddSourceDialog
            workspaceSlug={workspace.slug}
            agentId={agent.id}
            addUrl={addUrlSourceAction}
            addText={addTextSourceAction}
            addFile={addFileSourceAction}
          />
        </CardHeader>
        <CardBody className="p-0">
          <SourceList
            sources={sources}
            retryAction={retrySourceAction}
            deleteAction={deleteSourceAction}
          />
        </CardBody>
      </Card>

      <p className="text-xs text-white/35">
        Limits: 10 MB per file · 25 pages per crawl · same origin only · 10 seconds per request.
      </p>
    </div>
  )
}
