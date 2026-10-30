import type { Message } from '@felops/db/schema'
import { formatRelativeTime } from '@/lib/utils'

export function MessageThread({ messages }: { messages: Message[] }) {
  if (messages.length === 0) {
    return <p className="px-5 py-8 text-sm text-neutral-500">No messages yet.</p>
  }
  return (
    <div className="space-y-4 px-5 py-5">
      {messages.map((message) => {
        const rtl = /[\u0600-\u06FF]/.test(message.content)
        if (message.role === 'system') {
          return (
            <div key={message.id} className="flex justify-center">
              <p className="rounded-full bg-neutral-100 px-3 py-1 text-[11px] text-neutral-500">
                {message.content}
              </p>
            </div>
          )
        }
        const isCustomer = message.authorType === 'customer'
        return (
          <div key={message.id} className={isCustomer ? 'flex justify-start' : 'flex justify-end'}>
            <div className="max-w-[88%]" dir={rtl ? 'rtl' : 'ltr'}>
              <div
                className={
                  isCustomer
                    ? 'rounded-2xl rounded-bl-md border border-neutral-200 bg-white px-4 py-2.5 text-sm text-neutral-800'
                    : message.authorType === 'human'
                      ? 'rounded-2xl rounded-br-md bg-neutral-900 px-4 py-2.5 text-sm text-white'
                      : 'rounded-2xl rounded-br-md bg-orange-50 px-4 py-2.5 text-sm text-neutral-900'
                }
              >
                <p className="whitespace-pre-wrap leading-6">{message.content}</p>
                {message.citations.length > 0 ? (
                  <ul className="mt-2 space-y-1 border-t border-black/5 pt-2">
                    {message.citations.map((citation) => (
                      <li key={`${message.id}-${citation.index}`} className="text-[11px] opacity-80">
                        <span className="font-semibold">[{citation.index}]</span> {citation.title}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
              <p className="mt-1 text-[10px] text-neutral-400">
                {message.authorType} · {formatRelativeTime(message.createdAt)}
                {message.model ? ` · ${message.model}` : ''}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
