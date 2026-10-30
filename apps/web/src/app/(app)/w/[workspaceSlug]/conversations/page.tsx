import Link from 'next/link'
import { listConversations, lastMessageFor } from '@felops/core/conversations'
import type { ConversationStatus } from '@felops/db/schema'
import { requireWorkspaceMember } from '@/lib/workspace'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card'
import { ConversationList } from '@/components/conversations/conversation-list'

const filters: { key: string; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'open', label: 'Open' },
  { key: 'human', label: 'Human' },
  { key: 'closed', label: 'Closed' },
]

export default async function ConversationsPage({
  params,
  searchParams,
}: {
  params: Promise<{ workspaceSlug: string }>
  searchParams: Promise<{ status?: string }>
}) {
  const { workspaceSlug } = await params
  const query = await searchParams
  const { workspace } = await requireWorkspaceMember(workspaceSlug)
  const status = ['open', 'human', 'closed'].includes(query.status ?? '')
    ? (query.status as ConversationStatus)
    : undefined

  const page = await listConversations({ workspaceId: workspace.id, status, limit: 50 })
  const lastMessages = await lastMessageFor(page.items.map((item) => item.id))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">Conversations</h1>
        <p className="mt-1 text-sm text-neutral-600">
          Watch live threads, take over from the AI, and inspect the execution trace.
        </p>
      </div>

      <div className="flex flex-wrap gap-1">
        {filters.map((filter) => {
          const href =
            filter.key === 'all'
              ? `/w/${workspace.slug}/conversations`
              : `/w/${workspace.slug}/conversations?status=${filter.key}`
          const active = filter.key === (query.status ?? 'all')
          return (
            <Link
              key={filter.key}
              href={href}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                active
                  ? 'bg-neutral-900 text-white'
                  : 'border border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50'
              }`}
            >
              {filter.label}
            </Link>
          )
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{page.items.length} conversations</CardTitle>
        </CardHeader>
        <CardBody className="p-0">
          <ConversationList
            conversations={page.items}
            lastMessages={lastMessages}
            workspaceSlug={workspace.slug}
          />
        </CardBody>
      </Card>
    </div>
  )
}
