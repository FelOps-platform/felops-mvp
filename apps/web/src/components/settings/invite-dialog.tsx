'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'

export function InviteDialog({
  workspaceSlug,
  action,
}: {
  workspaceSlug: string
  action: (formData: FormData) => void
}) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        Invite member
      </Button>
      <Dialog
        open={open}
        onOpenChange={setOpen}
        title="Invite a teammate"
        description="The link is single-use and expires in 72 hours."
      >
        <form action={action} className="space-y-4" onSubmit={() => setOpen(false)}>
          <input type="hidden" name="workspaceSlug" value={workspaceSlug} />
          <Field label="Email">
            <Input name="email" type="email" required placeholder="teammate@example.com" />
          </Field>
          <Field label="Role">
            <Select name="role" defaultValue="member">
              <option value="member">Member</option>
              <option value="admin">Admin</option>
              <option value="owner">Owner</option>
            </Select>
          </Field>
          <Button type="submit" className="w-full">
            Send invitation
          </Button>
        </form>
      </Dialog>
    </>
  )
}
