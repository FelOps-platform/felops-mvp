'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Button } from '@/components/ui/button'

export function ApprovalButtons({
  workspaceSlug,
  runId,
}: {
  workspaceSlug: string
  runId: string
}) {
  const router = useRouter()
  const [busy, setBusy] = useState<'approve' | 'reject' | null>(null)
  const [error, setError] = useState('')

  async function act(kind: 'approve' | 'reject') {
    setBusy(kind)
    setError('')
    const response = await fetch(`/api/v1/action-runs/${runId}/${kind}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ workspaceSlug }),
    })
    setBusy(null)
    if (!response.ok) {
      const data = (await response.json().catch(() => ({}))) as { error?: string }
      setError(
        response.status === 403
          ? 'Only owners and admins can decide on actions.'
          : data.error === 'invalid_transition'
            ? 'This run has already moved on.'
            : 'Could not update the run.',
      )
      return
    }
    router.refresh()
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={() => act('approve')} disabled={busy !== null}>
          {busy === 'approve' ? 'Approving…' : 'Approve'}
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => act('reject')}
          disabled={busy !== null}
        >
          {busy === 'reject' ? 'Rejecting…' : 'Reject'}
        </Button>
      </div>
      {error ? <p className="mt-2 text-xs text-red-600">{error}</p> : null}
    </div>
  )
}
