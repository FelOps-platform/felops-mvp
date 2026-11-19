import Link from 'next/link'
import { and, desc, eq, gte, sql } from 'drizzle-orm'
import {
  action,
  actionRun,
  agent,
  conversation,
  db,
  knowledgeSource,
} from '@felops/db'
import { listAuditEvents } from '@felops/core/audit'
import { requireWorkspaceMember } from '@/lib/workspace'
import { formatEventType, formatRelativeTime } from '@/lib/utils'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/app-shell/page-header'

async function count(rows: Promise<{ count: number }[]>): Promise<number> {
  const [row] = await rows
  return row?.count ?? 0
}

export default async function WorkspaceDashboard({
  params,
}: {
  params: Promise<{ workspaceSlug: string }>
}) {
  const { workspaceSlug } = await params
  const { workspace } = await requireWorkspaceMember(workspaceSlug)
  const workspaceId = workspace.id
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000)

  const [activeAgents, recentConversations, pendingApprovals, readySources] = await Promise.all([
    count(
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(agent)
        .where(and(eq(agent.workspaceId, workspaceId), eq(agent.status, 'active'))),
    ),
    count(
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(conversation)
        .where(and(eq(conversation.workspaceId, workspaceId), gte(conversation.createdAt, since))),
    ),
    count(
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(actionRun)
        .where(and(eq(actionRun.workspaceId, workspaceId), eq(actionRun.status, 'pending'))),
    ),
    count(
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(knowledgeSource)
        .where(
          and(eq(knowledgeSource.workspaceId, workspaceId), eq(knowledgeSource.status, 'ready')),
        ),
    ),
  ])

  const [events, failedSources, pendingRuns, latestConversations] = await Promise.all([
    listAuditEvents(workspaceId, 10),
    db
      .select()
      .from(knowledgeSource)
      .where(
        and(eq(knowledgeSource.workspaceId, workspaceId), eq(knowledgeSource.status, 'failed')),
      )
      .limit(5),
    db
      .select({ run: actionRun, actionName: action.name })
      .from(actionRun)
      .innerJoin(action, eq(actionRun.actionId, action.id))
      .where(and(eq(actionRun.workspaceId, workspaceId), eq(actionRun.status, 'pending')))
      .limit(5),
    db
      .select()
      .from(conversation)
      .where(eq(conversation.workspaceId, workspaceId))
      .orderBy(desc(conversation.lastMessageAt))
      .limit(5),
  ])

  const cards = [
    {
      label: 'Active agents',
      value: activeAgents,
      href: `/w/${workspace.slug}/agents`,
      dot: 'bg-[#495CCA]',
    },
    {
      label: 'Conversations · 24h',
      value: recentConversations,
      href: `/w/${workspace.slug}/conversations`,
      dot: 'bg-[#00BE3F]',
    },
    {
      label: 'Pending approvals',
      value: pendingApprovals,
      href: `/w/${workspace.slug}/approvals`,
      dot: 'bg-[#F2B200]',
    },
    {
      label: 'Ready sources',
      value: readySources,
      href: `/w/${workspace.slug}/knowledge`,
      dot: 'bg-[#8A8A8A]',
    },
  ]

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Workspace overview"
        title={workspace.name}
        description="The loop: add knowledge, answer with citations, hand off, approve actions."
        actions={
          <Link href={`/w/${workspace.slug}/agents/new`}>
            <Button>Create an agent</Button>
          </Link>
        }
      />

      <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <Link key={card.label} href={card.href}>
            <Card className="h-full transition-colors hover:border-neutral-300">
              <CardBody className="p-5">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-500">
                    {card.label}
                  </p>
                  <span className={`h-2 w-2 rounded-full ${card.dot}`} />
                </div>
                <p className="mt-4 text-[30px] font-semibold leading-none tracking-[-0.03em] text-neutral-900">
                  {card.value}
                </p>
              </CardBody>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex items-center justify-between">
            <CardTitle>Recent activity</CardTitle>
            <Link
              href={`/w/${workspace.slug}/audit`}
              className="text-[11px] font-medium text-neutral-500 hover:text-neutral-900"
            >
              Audit trail
            </Link>
          </CardHeader>
          <CardBody className="p-0">
            {events.length === 0 ? (
              <p className="px-5 py-6 text-sm text-neutral-500">No activity yet.</p>
            ) : (
              <ul className="divide-y divide-neutral-100">
                {events.map((event) => (
                  <li key={event.id} className="flex items-start justify-between gap-4 px-5 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-neutral-900">
                        {formatEventType(event.type)}
                      </p>
                      <p className="text-xs text-neutral-500">
                        {event.actorId ?? 'system'} · {event.targetType ?? 'workspace'}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs text-neutral-400">
                      {formatRelativeTime(event.createdAt)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>Needs attention</CardTitle>
            </CardHeader>
            <CardBody>
              {failedSources.length === 0 && pendingRuns.length === 0 ? (
                <p className="text-sm text-neutral-500">Nothing needs attention.</p>
              ) : (
                <ul className="space-y-3">
                  {failedSources.map((source) => (
                    <li key={source.id} className="flex items-center justify-between gap-3">
                      <span className="text-sm text-neutral-700">
                        Source failed: {source.title}
                      </span>
                      <Badge tone="danger">failed</Badge>
                    </li>
                  ))}
                  {pendingRuns.map((item) => (
                    <li key={item.run.id} className="flex items-center justify-between gap-3">
                      <span className="text-sm text-neutral-700">
                        {item.actionName} waiting for approval
                      </span>
                      <Link href={`/w/${workspace.slug}/approvals`}>
                        <Badge tone="warning">review</Badge>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent conversations</CardTitle>
            </CardHeader>
            <CardBody className="p-0">
              {latestConversations.length === 0 ? (
                <p className="px-5 py-6 text-sm text-neutral-500">No conversations yet.</p>
              ) : (
                <ul className="divide-y divide-neutral-100">
                  {latestConversations.map((item) => (
                    <li key={item.id}>
                      <Link
                        href={`/w/${workspace.slug}/conversations/${item.id}`}
                        className="flex items-center justify-between gap-4 px-5 py-3 hover:bg-neutral-50"
                      >
                        <span className="min-w-0 truncate text-sm text-neutral-700">
                          {item.visitorId ?? 'Anonymous visitor'} · {item.channel}
                        </span>
                        <span className="shrink-0 text-xs text-neutral-400">
                          {formatRelativeTime(item.lastMessageAt)}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  )
}
