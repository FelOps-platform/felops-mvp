import Link from 'next/link'
import type { Workspace } from '@felops/db/schema'
import { ChevronsUpDown, Plus } from 'lucide-react'

export function WorkspaceSwitcher({
  current,
  workspaces,
}: {
  current: Workspace
  workspaces: Workspace[]
}) {
  return (
    <details className="group relative">
      <summary className="flex cursor-pointer list-none items-center gap-2.5 rounded-md border border-[#E5E7EB] bg-white px-3 py-2.5 text-sm font-medium text-[#111827] transition-colors hover:bg-[#F9FAFB] [&::-webkit-details-marker]:hidden">
        <span className="flex h-8 w-8 items-center justify-center rounded-md border border-[#E5E7EB] bg-[#F9FAFB] text-xs font-semibold text-[#111827]">
          {current.name.slice(0, 1).toUpperCase()}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] leading-5">{current.name}</span>
          <span className="block text-[11px] font-normal text-[#9CA3AF]">Workspace</span>
        </span>
        <ChevronsUpDown className="h-3.5 w-3.5 text-[#9CA3AF] transition-transform group-open:rotate-180" />
      </summary>
      <div className="absolute left-0 z-30 mt-2 w-full min-w-64 rounded-lg border border-[#E5E7EB] bg-white p-1.5">
        <p className="px-3 pb-1.5 pt-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#9CA3AF]">
          Workspaces
        </p>
        {workspaces.map((workspace) => {
          const active = workspace.id === current.id
          return (
            <Link
              key={workspace.id}
              href={`/w/${workspace.slug}`}
              className={
                'flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors ' +
                (active
                  ? 'bg-[#EEF2FF] text-[#3B4FC4]'
                  : 'text-[#4B5563] hover:bg-[#F9FAFB] hover:text-[#111827]')
              }
            >
              <span className="flex h-6 w-6 items-center justify-center rounded border border-[#E5E7EB] bg-white text-[10px] font-semibold text-[#111827]">
                {workspace.name.slice(0, 1).toUpperCase()}
              </span>
              <span className="block min-w-0 flex-1 truncate font-medium">{workspace.name}</span>
              {active ? <span className="h-1.5 w-1.5 rounded-full bg-[#495CCA]" /> : null}
            </Link>
          )
        })}
        <div className="mt-1 border-t border-[#E5E7EB] pt-1">
          <Link
            href="/onboarding/workspace?new=1"
            className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-[#495CCA] hover:bg-[#F9FAFB]"
          >
            <Plus className="h-4 w-4" />
            New workspace
          </Link>
        </div>
      </div>
    </details>
  )
}
