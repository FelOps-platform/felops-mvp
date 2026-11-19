import { and, eq, sql } from 'drizzle-orm'
import { db, knowledgeSource } from '@felops/db'
import { listMembers, listPendingInvitations } from '@felops/core/members'
import { getUsage } from '@felops/core/usage'
import { requireWorkspaceMember } from '@/lib/workspace'
import { formatRelativeTime } from '@/lib/utils'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { MembersTable } from '@/components/settings/members-table'
import { InviteDialog } from '@/components/settings/invite-dialog'
import { PlanCard } from '@/components/settings/plan-card'
import { PageHeader } from '@/components/app-shell/page-header'
import {
  changeRoleAction,
  inviteMemberAction,
  removeMemberAction,
  revokeInviteAction,
  updateWorkspaceAction,
} from './actions'

export default async function SettingsPage({
  params,
  searchParams,
}: {
  params: Promise<{ workspaceSlug: string }>
  searchParams: Promise<{ error?: string; saved?: string; invited?: string }>
}) {
  const { workspaceSlug } = await params
  const query = await searchParams
  const { workspace, role } = await requireWorkspaceMember(workspaceSlug)
  const canManage = role === 'owner' || role === 'admin'

  const [members, invitations, usage, sourceCounts] = await Promise.all([
    listMembers(workspace.id),
    listPendingInvitations(workspace.id),
    getUsage(workspace.id),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(knowledgeSource)
      .where(eq(knowledgeSource.workspaceId, workspace.id)),
  ])
  const sources = sourceCounts[0]?.count ?? 0

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Workspace identity, team access, and plan quotas."
      />

      {query.error === 'slug_taken' ? (
        <p className="rounded-lg border border-[#FECACA] bg-[#FEF2F2] px-3 py-2 text-sm text-[#B91C1C]">
          That workspace URL is already taken.
        </p>
      ) : null}
      {query.error === 'forbidden' ? (
        <p className="rounded-lg border border-[#FDE68A] bg-[#FFFBEB] px-3 py-2 text-sm text-[#92400E]">
          Only owners and admins can change these settings.
        </p>
      ) : null}
      {query.error === 'last_owner' ? (
        <p className="rounded-lg border border-[#FDE68A] bg-[#FFFBEB] px-3 py-2 text-sm text-[#92400E]">
          A workspace must keep at least one owner.
        </p>
      ) : null}
      {query.saved ? (
        <p className="rounded-lg border border-[#A7F3D0] bg-[#ECFDF5] px-3 py-2 text-sm text-[#047857]">
          Settings saved.
        </p>
      ) : null}
      {query.invited ? (
        <div className="rounded-lg border border-[#A7F3D0] bg-[#ECFDF5] px-3 py-2 text-sm text-[#047857]">
          <p>Invitation created. In development, share this link:</p>
          <p className="mt-1 break-all font-mono text-xs">{query.invited}</p>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card id="profile">
            <CardHeader>
              <CardTitle>Workspace</CardTitle>
            </CardHeader>
            <CardBody>
              <form action={updateWorkspaceAction} className="space-y-4">
                <input type="hidden" name="workspaceSlug" value={workspace.slug} />
                <Field label="Name">
                  <Input name="name" defaultValue={workspace.name} disabled={!canManage} />
                </Field>
                <Field label="URL slug" hint={`/w/${workspace.slug}`}>
                  <Input name="slug" defaultValue={workspace.slug} disabled={!canManage} />
                </Field>
                {canManage ? <Button type="submit">Save workspace</Button> : null}
              </form>
            </CardBody>
          </Card>

          <Card>
            <CardHeader className="flex items-center justify-between">
              <CardTitle>Members · {members.length}</CardTitle>
              {canManage ? (
                <InviteDialog workspaceSlug={workspace.slug} action={inviteMemberAction} />
              ) : null}
            </CardHeader>
            <CardBody className="p-0">
              <MembersTable
                members={members}
                workspaceSlug={workspace.slug}
                canManage={canManage}
                changeRoleAction={changeRoleAction}
                removeAction={removeMemberAction}
              />
            </CardBody>
          </Card>

          {invitations.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Pending invitations</CardTitle>
              </CardHeader>
              <CardBody className="p-0">
                <ul className="divide-y divide-neutral-100">
                  {invitations.map((invite) => (
                    <li
                      key={invite.id}
                      className="flex flex-wrap items-center justify-between gap-3 px-5 py-3"
                    >
                      <div>
                        <p className="text-sm font-medium text-neutral-900">{invite.email}</p>
                        <p className="text-xs text-neutral-500">
                          {invite.role} · expires {formatRelativeTime(invite.expiresAt)}
                        </p>
                      </div>
                      {canManage ? (
                        <form action={revokeInviteAction}>
                          <input type="hidden" name="workspaceSlug" value={workspace.slug} />
                          <input type="hidden" name="invitationId" value={invite.id} />
                          <Button variant="secondary" size="sm" type="submit">
                            Revoke
                          </Button>
                        </form>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>
          ) : null}
        </div>

        <div className="space-y-6">
          <div id="plan">
            <PlanCard
              plan={usage.plan}
              limits={usage.limits}
              messages={usage.messages}
              sources={sources}
            />
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Roles</CardTitle>
            </CardHeader>
            <CardBody className="space-y-2 text-xs leading-5 text-neutral-600">
              <p>
                <span className="font-semibold text-neutral-900">Owner</span> — billing, team, and
                every action.
              </p>
              <p>
                <span className="font-semibold text-neutral-900">Admin</span> — agents, knowledge,
                approvals, team.
              </p>
              <p>
                <span className="font-semibold text-neutral-900">Member</span> — conversations and
                human replies; cannot approve actions.
              </p>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  )
}
