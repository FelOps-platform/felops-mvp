import Link from 'next/link'
import { notFound } from 'next/navigation'
import { and, desc, eq } from 'drizzle-orm'
import { action, actionRun, db } from '@felops/db'
import {
  getConversation,
  listMessages,
} from '@felops/core/conversations'
import { requireWorkspaceMember } from '@/lib/workspace'
import { formatRelativeTime } from '@/lib/utils'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { MessageThread } from '@/components/conversations/message-thread'
import { ExecutionTrace } from '@/components/conversations/execution-trace'
import { Composer } from '@/components/conversations/composer'
import { closeConversationAction, replyAction, takeOverAction } from '../actions'

export default async function ConversationDetailPage({
  params,
}: {
  params: Promise<{ workspaceSlug: string; conversationId: string }>
}) {
  const { workspaceSlug, conversationId } = await params
  const { workspace } = await requireWorkspaceMember(workspaceSlug)
  const conversation = await getConversation({ workspaceId: workspace.id, conversationId })
  if (!conversation) notFound()

  const [messages, runs] = await Promise.all([
    listMessages({ workspaceId: workspace.id, conversationId }),
    db
      .select({ run: actionRun, actionName: action.name })
      .from(actionRun)
      .innerJoin(action, eq(actionRun.actionId, action.id))
      .where(
        and(
          eq(actionRun.workspaceId, workspace.id),
          eq(actionRun.conversationId, conversationId),
        ),
      )
      .orderBy(desc(actionRun.createdAt)),
  ])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            href={`/w/${workspace.slug}/conversations`}
            className="text-xs font-medium text-white/40 transition-colors hover:text-white"
          >
            ← Conversations
          </Link>
          <div className="mt-1 flex items-center gap-2">
            <h1 className="text-[24px] font-semibold tracking-[-0.02em] text-white">
              {conversation.visitorId ?? 'Anonymous visitor'}
            </h1>
            <Badge
              tone={
                conversation.status === 'human'
                  ? 'accent'
                  : conversation.status === 'closed'
                    ? 'neutral'
                    : 'success'
              }
            >
              {conversation.status}
            </Badge>
            <Badge>{conversation.channel}</Badge>
          </div>
        </div>
        <div className="flex gap-2">
          {conversation.status !== 'human' && conversation.status !== 'closed' ? (
            <form action={takeOverAction}>
              <input type="hidden" name="workspaceSlug" value={workspace.slug} />
              <input type="hidden" name="conversationId" value={conversation.id} />
              <Button type="submit" size="sm">
                Take over
              </Button>
            </form>
          ) : null}
          {conversation.status !== 'closed' ? (
            <form action={closeConversationAction}>
              <input type="hidden" name="workspaceSlug" value={workspace.slug} />
              <input type="hidden" name="conversationId" value={conversation.id} />
              <Button type="submit" size="sm" variant="outline-dark">
                Close
              </Button>
            </form>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Thread</CardTitle>
          </CardHeader>
          <CardBody className="p-0">
            <MessageThread messages={messages} />
            <Composer
              action={replyAction}
              disabled={conversation.status !== 'human'}
              workspaceSlug={workspace.slug}
              conversationId={conversation.id}
            />
          </CardBody>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Execution trace</CardTitle>
            </CardHeader>
            <CardBody className="p-0">
              <ExecutionTrace runs={runs} />
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Visitor</CardTitle>
            </CardHeader>
            <CardBody className="space-y-2 text-xs text-neutral-600">
              <p>
                <span className="text-neutral-400">Visitor ID:</span>{' '}
                {conversation.visitorId ?? '—'}
              </p>
              <p>
                <span className="text-neutral-400">Channel:</span> {conversation.channel}
              </p>
              <p>
                <span className="text-neutral-400">Started:</span>{' '}
                {formatRelativeTime(conversation.createdAt)}
              </p>
              <p>
                <span className="text-neutral-400">Last message:</span>{' '}
                {formatRelativeTime(conversation.lastMessageAt)}
              </p>
              <p>
                <span className="text-neutral-400">Assigned to:</span>{' '}
                {conversation.assignedTo ?? 'AI'}
              </p>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  )
}
