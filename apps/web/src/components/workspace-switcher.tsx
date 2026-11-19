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
      <summary className="flex cursor-pointer list-none items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/[0.07] [&::-webkit-details-marker]:hidden">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-xs font-bold text-[#0B0B0F]">
          {current.name.slice(0, 1).toUpperCase()}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] leading-5">{current.name}</span>
          <span className="block text-[11px] font-normal text-white/40">Workspace</span>
        </span>
        <ChevronsUpDown className="h-3.5 w-3.5 text-white/35 transition-transform group-open:rotate-180" />
      </summary>
      <div className="absolute left-0 z-30 mt-2 w-full min-w-64 rounded-xl border border-white/10 bg-[#141418] p-1.5 shadow-2xl shadow-black/40">
        <p className="px-3 pb-1.5 pt-2 text-[10px] font-medium uppercase tracking-[0.18em] text-white/35">
          Workspaces
        </p>
        {workspaces.map((workspace) => {
          const active = workspace.id === current.id
          return (
            <Link
              key={workspace.id}
              href={`/w/${workspace.slug}`}
              className={
                'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors ' +
                (active
                  ? 'bg-white/[0.08] text-white'
                  : 'text-white/65 hover:bg-white/[0.06] hover:text-white')
              }
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-white/10 text-[10px] font-bold text-white">
                {workspace.name.slice(0, 1).toUpperCase()}
              </span>
              <span className="block min-w-0 flex-1 truncate font-medium">{workspace.name}</span>
              {active ? <span className="h-1.5 w-1.5 rounded-full bg-[#FF6400]" /> : null}
            </Link>
          )
        })}
        <div className="mt-1 border-t border-white/10 pt-1">
          <Link
            href="/onboarding/workspace?new=1"
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-[#FF8A3F] hover:bg-white/[0.06]"
          >
            <Plus className="h-4 w-4" />
            New workspace
          </Link>
        </div>
      </div>
    </details>
  )
}
