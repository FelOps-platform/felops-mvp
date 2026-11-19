import Link from 'next/link'
import type { Conversation } from '@felops/db/schema'
import { Badge } from '@/components/ui/badge'
import { formatRelativeTime, initials } from '@/lib/utils'

export function ConversationList({
  conversations,
  lastMessages,
  workspaceSlug,
  activeId,
}: {
  conversations: Conversation[]
  lastMessages: Map<string, string>
  workspaceSlug: string
  activeId?: string
}) {
  if (conversations.length === 0) {
    return <p className="px-5 py-8 text-sm text-neutral-500">No conversations match this filter.</p>
  }
  return (
    <ul className="divide-y divide-neutral-100">
      {conversations.map((conversation) => (
        <li key={conversation.id}>
          <Link
            href={`/w/${workspaceSlug}/conversations/${conversation.id}`}
            className={`flex items-start gap-3 px-4 py-3 hover:bg-neutral-50 ${
              activeId === conversation.id ? 'bg-[#EEF2FF]' : ''
            }`}
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-xs font-semibold text-neutral-600">
              {initials(conversation.visitorId ?? 'Visitor')}
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center justify-between gap-2">
                <span className="truncate text-sm font-medium text-neutral-900">
                  {conversation.visitorId ?? 'Anonymous visitor'}
                </span>
                <span className="shrink-0 text-[11px] text-neutral-400">
                  {formatRelativeTime(conversation.lastMessageAt)}
                </span>
              </span>
              <span className="mt-0.5 block truncate text-xs text-neutral-500">
                {lastMessages.get(conversation.id) ?? 'No messages yet'}
              </span>
              <span className="mt-1 flex items-center gap-1.5">
                <Badge>{conversation.channel}</Badge>
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
              </span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  )
}
