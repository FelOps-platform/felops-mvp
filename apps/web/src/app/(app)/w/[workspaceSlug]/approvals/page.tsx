import { listActionRuns, listPendingRuns } from '@felops/core/approvals'
import { requireWorkspaceMember } from '@/lib/workspace'
import { Card, CardBody } from '@/components/ui/card'
import { ApprovalDetail } from '@/components/actions/approval-detail'
import { PageHeader } from '@/components/app-shell/page-header'

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
      <PageHeader
        title="Approvals"
        description="Sensitive actions pause here. Only owners and admins can approve or reject."
      />

      {query.tested ? (
        <p className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
          Test run created. Approve it below to execute exactly once.
        </p>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/35">
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
        <h2 className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/35">
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
