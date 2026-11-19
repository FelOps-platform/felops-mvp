import Link from 'next/link'
import { listConversations, lastMessageFor } from '@felops/core/conversations'
import type { ConversationStatus } from '@felops/db/schema'
import { requireWorkspaceMember } from '@/lib/workspace'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card'
import { ConversationList } from '@/components/conversations/conversation-list'
import { PageHeader } from '@/components/app-shell/page-header'

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
      <PageHeader
        title="Conversations"
        description="Watch live threads, take over from the AI, and inspect the execution trace."
      />

      <div className="flex flex-wrap gap-1.5">
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
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                active
                  ? 'bg-[#495CCA] text-white'
                  : 'border border-white/10 bg-white/[0.04] text-white/60 hover:bg-white/[0.08] hover:text-white'
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
