'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

export function AgentNav({
  slug,
  agentId,
}: {
  slug: string
  agentId: string
}) {
  const pathname = usePathname()
  const base = `/w/${slug}/agents/${agentId}`
  const items = [
    { href: base, label: 'Overview' },
    { href: `${base}/knowledge`, label: 'Knowledge' },
    { href: `${base}/actions`, label: 'Actions' },
    { href: `${base}/playground`, label: 'Playground' },
  ]
  return (
    <nav className="flex flex-wrap gap-1 border-b border-neutral-200 pb-2" aria-label="Agent">
      {items.map((item) => {
        const active = item.href === base ? pathname === base : pathname.startsWith(item.href)
        return (
          <Link
            key={item.label}
            href={item.href}
            className={cn(
              'rounded-lg px-3 py-1.5 text-sm font-medium',
              active ? 'bg-neutral-900 text-white' : 'text-neutral-600 hover:bg-neutral-100',
            )}
          >
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
