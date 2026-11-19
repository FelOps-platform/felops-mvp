import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { PlanLimits, PlanId } from '@felops/config'

function Bar({ used, limit }: { used: number; limit: number }) {
  const percent = Math.min(100, Math.round((used / Math.max(1, limit)) * 100))
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-100">
      <div
        className="h-full rounded-full bg-[#495CCA]"
        style={{ width: `${percent}%` }}
        role="progressbar"
        aria-valuenow={used}
        aria-valuemin={0}
        aria-valuemax={limit}
      />
    </div>
  )
}

export function PlanCard({
  plan,
  limits,
  messages,
  sources,
}: {
  plan: PlanId
  limits: PlanLimits
  messages: number
  sources: number
}) {
  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <CardTitle>Plan</CardTitle>
        <Badge tone="primary">{plan}</Badge>
      </CardHeader>
      <CardBody className="space-y-4">
        <div>
          <div className="mb-1 flex items-center justify-between text-xs text-neutral-600">
            <span>Messages this month</span>
            <span>
              {messages} / {limits.messages}
            </span>
          </div>
          <Bar used={messages} limit={limits.messages} />
        </div>
        <div>
          <div className="mb-1 flex items-center justify-between text-xs text-neutral-600">
            <span>Knowledge sources</span>
            <span>
              {sources} / {limits.sources}
            </span>
          </div>
          <Bar used={sources} limit={limits.sources} />
        </div>
        <p className="text-xs text-neutral-500">
          {plan === 'free'
            ? 'Free includes 100 messages and 5 sources per month.'
            : `This plan costs ${limits.priceEgp} EGP per month.`}
        </p>
        <a href="mailto:sales@felops.io?subject=Upgrade%20my%20Felops%20plan">
          <Button variant="secondary" className="w-full">
            {plan === 'free' ? 'Upgrade plan' : 'Talk to sales'}
          </Button>
        </a>
      </CardBody>
    </Card>
  )
}
