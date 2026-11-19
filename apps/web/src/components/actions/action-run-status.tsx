import type { ActionRunStatus } from '@felops/db/schema'
import { Badge } from '@/components/ui/badge'

const tones: Record<ActionRunStatus, 'neutral' | 'success' | 'warning' | 'danger' | 'accent'> = {
  pending: 'warning',
  approved: 'accent',
  rejected: 'neutral',
  running: 'accent',
  succeeded: 'success',
  failed: 'danger',
}

export function ActionRunStatusBadge({ status }: { status: string }) {
  return (
    <Badge tone={tones[status as ActionRunStatus] ?? 'neutral'}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  )
}
