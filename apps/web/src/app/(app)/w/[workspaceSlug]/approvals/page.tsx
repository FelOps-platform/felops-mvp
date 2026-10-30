import { listActionRuns, listPendingRuns } from '@felops/core/approvals'
import { requireWorkspaceMember } from '@/lib/workspace'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card'
import { ApprovalDetail } from '@/components/actions/approval-detail'

export default async function ApprovalsPage({
  params,
  searchParams,
}: {
  params: Promise<{ workspaceSlug: string }>
  searchParams: Promise<{ tested?: string }>
}) {
  const { workspaceSlug } = await params
  const query = await searchParams
  const { workspace, role } = await requireWorkspaceMember(workspaceSlug)
  const canDecide = role === 'owner' || role === 'admin'

  const [pending, recent] = await Promise.all([
    listPendingRuns(workspace.id),
    listActionRuns({ workspaceId: workspace.id, limit: 50 }),
  ])
  const history = recent.filter((item) => item.run.status !== 'pending')

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">Approvals</h1>
        <p className="mt-1 text-sm text-neutral-600">
          Sensitive actions pause here. Only owners and admins can approve or reject.
        </p>
      </div>

      {query.tested ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          Test run created. Approve it below to execute exactly once.
        </p>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
          Pending · {pending.length}
        </h2>
        {pending.length === 0 ? (
          <Card>
            <CardBody>
              <p className="text-sm text-neutral-500">No actions are waiting for review.</p>
            </CardBody>
          </Card>
        ) : (
          pending.map((item) => (
            <ApprovalDetail
              key={item.run.id}
              run={item.run}
              actionName={item.actionName}
              workspaceSlug={workspace.slug}
              conversationId={item.run.conversationId}
              canDecide={canDecide}
            />
          ))
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
          History
        </h2>
        {history.length === 0 ? (
          <Card>
            <CardBody>
              <p className="text-sm text-neutral-500">No decisions yet.</p>
            </CardBody>
          </Card>
        ) : (
          history.slice(0, 20).map((item) => (
            <ApprovalDetail
              key={item.run.id}
              run={item.run}
              actionName={item.actionName}
              workspaceSlug={workspace.slug}
              conversationId={item.run.conversationId}
              canDecide={canDecide}
              showButtons={false}
            />
          ))
        )}
      </section>
    </div>
  )
}
