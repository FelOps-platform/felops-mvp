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
            {index > 0 ? <span className="text-white/20">→</span> : null}
            <Link
              href={href}
              className={cn(
                'rounded-md px-2 py-1 transition-colors',
                active === step.key
                  ? 'bg-[#495CCA] text-white'
                  : done
                    ? 'text-emerald-400'
                    : 'text-white/45 hover:bg-white/[0.06] hover:text-white',
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
