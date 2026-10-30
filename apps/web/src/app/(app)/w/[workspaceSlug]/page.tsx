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
import { formatRelativeTime } from '@/lib/utils'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

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
    { label: 'Active agents', value: activeAgents, href: `/w/${workspace.slug}/agents` },
    {
      label: 'Conversations · 24h',
      value: recentConversations,
      href: `/w/${workspace.slug}/conversations`,
    },
    { label: 'Pending approvals', value: pendingApprovals, href: `/w/${workspace.slug}/approvals` },
    { label: 'Ready sources', value: readySources, href: `/w/${workspace.slug}/agents` },
  ]

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
            {workspace.name}
          </h1>
          <p className="mt-1 text-sm text-neutral-600">
            The loop: add knowledge, answer with citations, hand off, approve actions.
          </p>
        </div>
        <Link href={`/w/${workspace.slug}/agents/new`}>
          <Button>Create an agent</Button>
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <Link key={card.label} href={card.href}>
            <Card className="transition-colors hover:border-neutral-300">
              <CardBody>
                <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                  {card.label}
                </p>
                <p className="mt-2 text-3xl font-semibold tracking-tight text-neutral-900">
                  {card.value}
                </p>
              </CardBody>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex items-center justify-between">
            <CardTitle>Recent activity</CardTitle>
            <span className="text-xs text-neutral-500">Audit trail</span>
          </CardHeader>
          <CardBody className="p-0">
            {events.length === 0 ? (
              <p className="px-5 py-6 text-sm text-neutral-500">No activity yet.</p>
            ) : (
              <ul className="divide-y divide-neutral-100">
                {events.map((event) => (
                  <li key={event.id} className="flex items-start justify-between gap-4 px-5 py-3">
                    <div>
                      <p className="text-sm font-medium text-neutral-900">{event.type}</p>
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

        <div className="space-y-6">
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
                        <span className="text-sm text-neutral-700">
                          {item.visitorId ?? 'Anonymous visitor'} · {item.channel}
                        </span>
                        <span className="text-xs text-neutral-400">
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
