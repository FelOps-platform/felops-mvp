import type * as React from 'react'
import { cn } from '@/lib/utils'

export function DropdownMenu({
  trigger,
  children,
  className,
}: {
  trigger: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  return (
    <details className="group relative">
      <summary className={cn('list-none cursor-pointer', className)}>{trigger}</summary>
      <div className="absolute left-0 z-30 mt-2 min-w-56 rounded-lg border border-neutral-200 bg-white p-1">
        {children}
      </div>
    </details>
  )
}

export function DropdownItem({
  className,
  ...props
}: React.AnchorHTMLAttributes<HTMLAnchorElement>) {
  return (
    <a
      className={cn('block rounded-md px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-100', className)}
      {...props}
    />
  )
}
