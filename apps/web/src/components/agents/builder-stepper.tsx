import Link from 'next/link'
import { cn } from '@/lib/utils'

const steps = [
  { key: 'basics', label: '1. Basics' },
  { key: 'knowledge', label: '2. Knowledge' },
  { key: 'publish', label: '3. Publish' },
]

export function BuilderStepper({
  slug,
  agentId,
  active,
}: {
  slug: string
  agentId: string
  active: 'basics' | 'knowledge' | 'publish'
}) {
  return (
    <ol className="flex flex-wrap items-center gap-2 text-sm">
      {steps.map((step, index) => {
        const href =
          step.key === 'knowledge'
            ? `/w/${slug}/agents/${agentId}/knowledge`
            : `/w/${slug}/agents/${agentId}`
        const done = steps.findIndex((item) => item.key === active) > index
        return (
          <li key={step.key} className="flex items-center gap-2">
            {index > 0 ? <span className="text-neutral-300">→</span> : null}
            <Link
              href={href}
              className={cn(
                'rounded-md px-2 py-1',
                active === step.key
                  ? 'bg-neutral-900 text-white'
                  : done
                    ? 'text-emerald-700'
                    : 'text-neutral-500 hover:bg-neutral-100',
              )}
            >
              {step.label}
            </Link>
          </li>
        )
      })}
    </ol>
  )
}
