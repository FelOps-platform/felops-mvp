import { notFound } from 'next/navigation'
import { and, desc, eq } from 'drizzle-orm'
import { actionRun, db } from '@felops/db'
import { listActions } from '@felops/core/actions'
import { findAgent } from '@felops/db/repositories/agents'
import { requireWorkspaceMember } from '@/lib/workspace'
import { formatRelativeTime } from '@/lib/utils'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table'
import { ActionRunStatusBadge } from '@/components/actions/action-run-status'
import {
  createActionAction,
  deleteActionAction,
  testActionAction,
  toggleActionAction,
} from './actions'

const DEFAULT_PARAMETERS = JSON.stringify(
  {
    type: 'object',
    properties: {
      reason: { type: 'string', description: 'Why the customer wants a refund' },
    },
    required: ['reason'],
    additionalProperties: false,
  },
  null,
  2,
)

export default async function ActionsPage({
  params,
  searchParams,
}: {
  params: Promise<{ workspaceSlug: string; agentId: string }>
  searchParams: Promise<{ error?: string; created?: string; tested?: string }>
}) {
  const { workspaceSlug, agentId } = await params
  const query = await searchParams
  const { workspace } = await requireWorkspaceMember(workspaceSlug)
  const agent = await findAgent({ workspaceId: workspace.id, agentId })
  if (!agent) notFound()

  const actions = await listActions({ workspaceId: workspace.id, agentId: agent.id })
  const runs = await db
    .select()
    .from(actionRun)
    .where(and(eq(actionRun.workspaceId, workspace.id), eq(actionRun.agentId, agent.id)))
    .orderBy(desc(actionRun.createdAt))
    .limit(50)
  const lastRunByAction = new Map<string, (typeof runs)[number]>()
  for (const run of runs) {
    if (!lastRunByAction.has(run.actionId)) lastRunByAction.set(run.actionId, run)
  }

  return (
    <div className="space-y-6">
      {query.error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {query.error === 'json'
            ? 'The parameters or headers are not valid JSON.'
            : 'Check the action URL and fields. Private addresses are blocked.'}
        </p>
      ) : null}
      {query.created ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          Action created.
        </p>
      ) : null}
      {query.tested ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          Test run created. Review it in Approvals.
        </p>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>HTTP actions</CardTitle>
        </CardHeader>
        <CardBody className="p-0">
          {actions.length === 0 ? (
            <p className="px-5 py-6 text-sm text-neutral-500">
              No actions yet. Add one below — refunds, order lookups, or ticket creation.
            </p>
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Name</TH>
                  <TH>Method</TH>
                  <TH>Approval</TH>
                  <TH>Last run</TH>
                  <TH>Enabled</TH>
                  <TH />
                </TR>
              </THead>
              <TBody>
                {actions.map((item) => {
                  const last = lastRunByAction.get(item.id)
                  return (
                    <TR key={item.id}>
                      <TD>
                        <p className="font-medium text-neutral-900">{item.name}</p>
                        <p className="truncate text-xs text-neutral-500">{item.urlTemplate}</p>
                      </TD>
                      <TD>
                        <Badge>{item.method}</Badge>
                      </TD>
                      <TD>
                        <Badge tone={item.approvalRequired ? 'warning' : 'neutral'}>
                          {item.approvalRequired ? 'required' : 'automatic'}
                        </Badge>
                      </TD>
                      <TD>
                        {last ? (
                          <div className="flex items-center gap-2">
                            <ActionRunStatusBadge status={last.status} />
                            <span className="text-xs text-neutral-400">
                              {formatRelativeTime(last.createdAt)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-neutral-400">never</span>
                        )}
                      </TD>
                      <TD>
                        <form action={toggleActionAction}>
                          <input type="hidden" name="workspaceSlug" value={workspace.slug} />
                          <input type="hidden" name="agentId" value={agent.id} />
                          <input type="hidden" name="actionId" value={item.id} />
                          <input type="hidden" name="enabled" value={item.enabled ? 'false' : 'true'} />
                          <button type="submit" className="text-xs text-[#FA6400] hover:underline">
                            {item.enabled ? 'enabled' : 'disabled'}
                          </button>
                        </form>
                      </TD>
                      <TD>
                        <div className="flex justify-end gap-2">
                          <form action={testActionAction}>
                            <input type="hidden" name="workspaceSlug" value={workspace.slug} />
                            <input type="hidden" name="agentId" value={agent.id} />
                            <input type="hidden" name="actionId" value={item.id} />
                            <input
                              type="hidden"
                              name="args"
                              value={JSON.stringify({ reason: 'Test request from the dashboard' })}
                            />
                            <Button variant="secondary" size="sm" type="submit">
                              Test request
                            </Button>
                          </form>
                          <form action={deleteActionAction}>
                            <input type="hidden" name="workspaceSlug" value={workspace.slug} />
                            <input type="hidden" name="agentId" value={agent.id} />
                            <input type="hidden" name="actionId" value={item.id} />
                            <Button variant="danger" size="sm" type="submit">
                              Delete
                            </Button>
                          </form>
                        </div>
                      </TD>
                    </TR>
                  )
                })}
              </TBody>
            </Table>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Add an action</CardTitle>
        </CardHeader>
        <CardBody>
          <form action={createActionAction} className="space-y-5">
            <input type="hidden" name="workspaceSlug" value={workspace.slug} />
            <input type="hidden" name="agentId" value={agent.id} />
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Name" className="sm:col-span-1">
                <Input name="name" required placeholder="Request refund" />
              </Field>
              <Field label="Method">
                <Select name="method" defaultValue="POST">
                  <option value="POST">POST</option>
                  <option value="GET">GET</option>
                </Select>
              </Field>
              <Field label="Approval">
                <label className="flex h-10 items-center gap-2 rounded-lg border border-neutral-300 bg-white px-3 text-sm">
                  <input type="checkbox" name="approvalRequired" defaultChecked />
                  Require approval
                </label>
              </Field>
            </div>
            <Field label="Description">
              <Input name="description" placeholder="Ask the store to refund an order" />
            </Field>
            <Field
              label="URL template"
              hint="Use {{parameter}} placeholders. Private IPs and localhost are blocked."
            >
              <Input name="urlTemplate" required placeholder="https://api.example.com/refunds" />
            </Field>
            <Field label="Body template" hint="Optional. JSON with {{parameter}} placeholders.">
              <Textarea
                name="bodyTemplate"
                rows={3}
                defaultValue={'{"reason":"{{reason}}"}'}
              />
            </Field>
            <Field label="Parameters (JSON Schema)">
              <Textarea name="parameters" rows={9} defaultValue={DEFAULT_PARAMETERS} />
            </Field>
            <Field
              label="Encrypted headers (JSON)"
              hint="Stored with AES-256-GCM. Never shown in public APIs."
            >
              <Textarea name="headers" rows={2} defaultValue={'{}'} />
            </Field>
            <label className="flex items-center gap-2 text-sm text-neutral-700">
              <input type="checkbox" name="enabled" defaultChecked />
              Enabled
            </label>
            <Button type="submit">Create action</Button>
          </form>
        </CardBody>
      </Card>
    </div>
  )
}
