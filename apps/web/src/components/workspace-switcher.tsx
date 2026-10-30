import Link from 'next/link'
import type { Workspace } from '@felops/db/schema'
import { ChevronsUpDown } from 'lucide-react'

export function WorkspaceSwitcher({
  current,
  workspaces,
}: {
  current: Workspace
  workspaces: Workspace[]
}) {
  return (
    <details className="relative">
      <summary className="flex cursor-pointer list-none items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm font-medium text-neutral-900 hover:bg-neutral-50">
        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[#FA6400] text-[11px] font-bold text-white">
          {current.name.slice(0, 1).toUpperCase()}
        </span>
        <span className="max-w-40 truncate">{current.name}</span>
        <ChevronsUpDown className="h-3.5 w-3.5 text-neutral-400" />
      </summary>
      <div className="absolute left-0 z-30 mt-2 w-64 rounded-lg border border-neutral-200 bg-white p-1 shadow-lg">
        <p className="px-3 py-2 text-[11px] font-medium uppercase tracking-wide text-neutral-400">
          Workspaces
        </p>
        {workspaces.map((workspace) => (
          <Link
            key={workspace.id}
            href={`/w/${workspace.slug}`}
            className="block rounded-md px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-100"
          >
            <span className="block font-medium text-neutral-900">{workspace.name}</span>
            <span className="text-xs text-neutral-500">/w/{workspace.slug}</span>
          </Link>
        ))}
        <div className="mt-1 border-t border-neutral-100 pt-1">
          <Link
            href="/onboarding/workspace?new=1"
            className="block rounded-md px-3 py-2 text-sm text-[#FA6400] hover:bg-orange-50"
          >
            + New workspace
          </Link>
        </div>
      </div>
    </details>
  )
}
