import type { ReactNode } from 'react'

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string
  title: string
  description?: string
  actions?: ReactNode
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow ? (
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/30">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="text-[26px] font-semibold tracking-[-0.025em] text-white sm:text-[30px]">
          {title}
        </h1>
        {description ? (
          <p className="mt-1.5 max-w-2xl text-sm leading-6 text-white/50">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  )
}
