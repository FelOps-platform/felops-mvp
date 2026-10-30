import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table'
import { formatRelativeTime } from '@/lib/utils'

export function MembersTable({
  members,
  workspaceSlug,
  canManage,
  changeRoleAction,
  removeAction,
}: {
  members: {
    userId: string
    role: string
    name: string | null
    email: string | null
    createdAt: Date
  }[]
  workspaceSlug: string
  canManage: boolean
  changeRoleAction: (formData: FormData) => void
  removeAction: (formData: FormData) => void
}) {
  return (
    <Table>
      <THead>
        <TR>
          <TH>Member</TH>
          <TH>Role</TH>
          <TH>Joined</TH>
          <TH />
        </TR>
      </THead>
      <TBody>
        {members.map((member) => (
          <TR key={member.userId}>
            <TD>
              <p className="font-medium text-neutral-900">{member.name ?? 'Pending member'}</p>
              <p className="text-xs text-neutral-500">{member.email ?? member.userId}</p>
            </TD>
            <TD>
              {canManage ? (
                <form action={changeRoleAction} className="flex items-center gap-2">
                  <input type="hidden" name="workspaceSlug" value={workspaceSlug} />
                  <input type="hidden" name="userId" value={member.userId} />
                  <Select name="role" defaultValue={member.role} className="h-8 w-28 text-xs">
                    <option value="member">Member</option>
                    <option value="admin">Admin</option>
                    <option value="owner">Owner</option>
                  </Select>
                  <Button variant="secondary" size="sm" type="submit">
                    Save
                  </Button>
                </form>
              ) : (
                <span className="text-sm">{member.role}</span>
              )}
            </TD>
            <TD className="text-xs text-neutral-500">{formatRelativeTime(member.createdAt)}</TD>
            <TD>
              {canManage ? (
                <form action={removeAction}>
                  <input type="hidden" name="workspaceSlug" value={workspaceSlug} />
                  <input type="hidden" name="userId" value={member.userId} />
                  <Button variant="danger" size="sm" type="submit">
                    Remove
                  </Button>
                </form>
              ) : null}
            </TD>
          </TR>
        ))}
      </TBody>
    </Table>
  )
}
