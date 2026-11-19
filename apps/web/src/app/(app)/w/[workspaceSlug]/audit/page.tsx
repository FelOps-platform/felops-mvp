import { listAuditEvents } from '@felops/core/audit'
import { requireWorkspaceMember } from '@/lib/workspace'
import { formatEventType, formatRelativeTime } from '@/lib/utils'
import { Card, CardBody } from '@/components/ui/card'
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table'
import { PageHeader } from '@/components/app-shell/page-header'

export default async function AuditPage({
  params,
}: {
  params: Promise<{ workspaceSlug: string }>
}) {
  const { workspaceSlug } = await params
  const { workspace } = await requireWorkspaceMember(workspaceSlug)
  const events = await listAuditEvents(workspace.id, 100)

  return (
    <div className="space-y-7">
      <PageHeader
        title="Audit trail"
        description="Every agent change, approval decision, and executed action is recorded here."
      />

      <Card>
        <CardBody className="p-0">
          {events.length === 0 ? (
            <p className="px-6 py-14 text-center text-sm text-neutral-500">
              No audit events yet. Create an agent or approve an action to start the trail.
            </p>
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH className="pl-5">Event</TH>
                  <TH>Actor</TH>
                  <TH>Target</TH>
                  <TH>When</TH>
                </TR>
              </THead>
              <TBody>
                {events.map((event) => (
                  <TR key={event.id}>
                    <TD className="pl-5">
                      <span className="font-medium text-neutral-900">{formatEventType(event.type)}</span>
                      <span className="mt-0.5 block text-[11px] text-neutral-400">{event.type}</span>
                    </TD>
                    <TD className="font-mono text-[11px] text-neutral-500">
                      {event.actorId ?? 'system'}
                    </TD>
                    <TD className="text-sm text-neutral-600">
                      {event.targetType ?? 'workspace'}
                      {event.targetId ? (
                        <span className="block font-mono text-[10px] text-neutral-400">
                          {event.targetId}
                        </span>
                      ) : null}
                    </TD>
                    <TD className="whitespace-nowrap text-xs text-neutral-500">
                      {formatRelativeTime(event.createdAt)}
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </CardBody>
      </Card>
    </div>
  )
}
