import { Badge } from '@/components/ui/badge'
import type { AgentStatus } from '@felops/db/schema'

export function AgentStatusBadge({ status }: { status: string }) {
  const tone =
    status === 'active' ? 'success' : status === 'paused' ? 'warning' : ('neutral' as const)
  return <Badge tone={tone}>{status}</Badge>
}

export function statusTone(status: AgentStatus): 'success' | 'warning' | 'neutral' {
  return status === 'active' ? 'success' : status === 'paused' ? 'warning' : 'neutral'
}
