'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const items = [
  { href: '', label: 'Dashboard' },
  { href: '/agents', label: 'Agents' },
  { href: '/conversations', label: 'Conversations' },
  { href: '/approvals', label: 'Approvals' },
  { href: '/settings', label: 'Settings' },
]

export function WorkspaceNav({ slug }: { slug: string }) {
  const pathname = usePathname()
  const base = `/w/${slug}`
  return (
    <nav className="flex flex-wrap items-center gap-1" aria-label="Workspace">
      {items.map((item) => {
        const href = `${base}${item.href}`
        const active =
          item.href === ''
            ? pathname === base
            : pathname === href || pathname.startsWith(`${href}/`)
        return (
          <Link
            key={item.label}
            href={href}
            className={cn(
              'rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              active
                ? 'bg-neutral-900 text-white'
                : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900',
            )}
          >
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
