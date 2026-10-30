import type { ActionRun } from '@felops/db/schema'
import { ActionRunStatusBadge } from '@/components/actions/action-run-status'
import { formatRelativeTime } from '@/lib/utils'

export function ExecutionTrace({
  runs,
}: {
  runs: { run: ActionRun; actionName: string }[]
}) {
  if (runs.length === 0) {
    return (
      <p className="px-4 py-4 text-xs text-neutral-500">
        No actions were requested in this conversation.
      </p>
    )
  }
  return (
    <ul className="divide-y divide-neutral-100">
      {runs.map(({ run, actionName }) => (
        <li key={run.id} className="px-4 py-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium text-neutral-900">{actionName}</span>
            <ActionRunStatusBadge status={run.status} />
          </div>
          <p className="mt-1 text-[11px] text-neutral-500">
            {formatRelativeTime(run.createdAt)} · approved by {run.approvedBy ?? '—'}
          </p>
          {run.response ? (
            <p className="mt-1 truncate font-mono text-[11px] text-neutral-500">
              {JSON.stringify(run.response)}
            </p>
          ) : null}
          {run.error ? <p className="mt-1 text-[11px] text-red-600">{run.error}</p> : null}
        </li>
      ))}
    </ul>
  )
}
