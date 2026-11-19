import Link from 'next/link'
import type { ActionRun } from '@felops/db/schema'
import { ActionRunStatusBadge } from './action-run-status'
import { ApprovalButtons } from './approval-buttons'
import { formatRelativeTime } from '@/lib/utils'

export function ApprovalDetail({
  run,
  actionName,
  workspaceSlug,
  conversationId,
  canDecide,
  showButtons = true,
}: {
  run: ActionRun
  actionName: string
  workspaceSlug: string
  conversationId: string | null
  canDecide: boolean
  showButtons?: boolean
}) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-neutral-100 px-5 py-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-neutral-900">{actionName}</h3>
            <ActionRunStatusBadge status={run.status} />
          </div>
          <p className="mt-1 text-xs text-neutral-500">
            Run #{run.id.slice(0, 8)} · {formatRelativeTime(run.createdAt)} · {run.attempts}{' '}
            attempt{run.attempts === 1 ? '' : 's'}
          </p>
        </div>
        {showButtons && run.status === 'pending' ? (
          canDecide ? (
            <ApprovalButtons workspaceSlug={workspaceSlug} runId={run.id} />
          ) : (
            <span className="text-xs text-neutral-500">Owner or admin approval required</span>
          )
        ) : null}
      </div>
      <div className="grid gap-4 px-5 py-4 sm:grid-cols-2">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wide text-neutral-500">
            Parameters
          </p>
          <pre className="mt-2 overflow-x-auto rounded-lg bg-neutral-50 p-3 text-xs text-neutral-700">
            {JSON.stringify(run.args, null, 2)}
          </pre>
        </div>
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wide text-neutral-500">
            Exact request
          </p>
          <pre className="mt-2 overflow-x-auto rounded-lg bg-neutral-50 p-3 text-xs text-neutral-700">
            {run.request ? JSON.stringify(run.request, null, 2) : 'Not sent yet'}
          </pre>
        </div>
        {run.response ? (
          <div className="sm:col-span-2">
            <p className="text-[11px] font-medium uppercase tracking-wide text-neutral-500">
              Response
            </p>
            <pre className="mt-2 overflow-x-auto rounded-lg bg-neutral-50 p-3 text-xs text-neutral-700">
              {JSON.stringify(run.response, null, 2)}
            </pre>
          </div>
        ) : null}
        {run.error ? (
          <div className="sm:col-span-2">
            <p className="text-[11px] font-medium uppercase tracking-wide text-neutral-500">
              Error
            </p>
            <p className="mt-1 text-xs text-red-600">{run.error}</p>
          </div>
        ) : null}
        <div className="sm:col-span-2 flex flex-wrap items-center gap-4 border-t border-neutral-100 pt-3 text-xs text-neutral-500">
          {conversationId ? (
            <Link
              href={`/w/${workspaceSlug}/conversations/${conversationId}`}
              className="text-[#495CCA] hover:underline"
            >
              Open conversation
            </Link>
          ) : (
            <span>No conversation attached</span>
          )}
          <span>Approved by: {run.approvedBy ?? '—'}</span>
          <span>Finished: {formatRelativeTime(run.finishedAt)}</span>
        </div>
      </div>
    </div>
  )
}
