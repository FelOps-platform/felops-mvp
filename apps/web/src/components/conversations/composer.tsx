'use client'

import { useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

export function Composer({
  action,
  disabled,
  workspaceSlug,
  conversationId,
}: {
  action: (formData: FormData) => void
  disabled: boolean
  workspaceSlug: string
  conversationId: string
}) {
  const formRef = useRef<HTMLFormElement>(null)
  return (
    <form
      ref={formRef}
      action={(formData) => {
        action(formData)
        formRef.current?.reset()
      }}
      className="border-t border-neutral-100 p-3"
    >
      <input type="hidden" name="workspaceSlug" value={workspaceSlug} />
      <input type="hidden" name="conversationId" value={conversationId} />
      <div className="flex items-end gap-2">
        <Textarea
          name="content"
          rows={2}
          required
          disabled={disabled}
          maxLength={4000}
          placeholder={disabled ? 'Take over the conversation to reply' : 'Reply as a human…'}
          className="min-h-10 resize-none"
        />
        <Button type="submit" disabled={disabled}>
          Send
        </Button>
      </div>
    </form>
  )
}
