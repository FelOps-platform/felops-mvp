import Link from 'next/link'
import type { CSSProperties } from 'react'
import { cn } from '@/lib/utils'

const mask = (file: string): CSSProperties => ({
  WebkitMaskImage: `url(/brand/${file})`,
  WebkitMaskRepeat: 'no-repeat',
  WebkitMaskPosition: 'center',
  WebkitMaskSize: 'contain',
  maskImage: `url(/brand/${file})`,
  maskRepeat: 'no-repeat',
  maskPosition: 'center',
  maskSize: 'contain',
})

export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn('block h-7 w-[24.7px] bg-current', className)}
      style={mask('felops-mark.svg')}
    />
  )
}

export function BrandWordmark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn('block h-[17px] w-[55px] bg-current', className)}
      style={mask('felops-wordmark.svg')}
    />
  )
}

export function Brand({
  href = '/',
  className,
  markClassName,
  wordmarkClassName,
  wordmark = true,
}: {
  href?: string
  className?: string
  markClassName?: string
  wordmarkClassName?: string
  wordmark?: boolean
}) {
  return (
    <Link
      href={href}
      aria-label="Felops"
      className={cn('inline-flex items-center gap-2.5 text-white', className)}
    >
      <BrandMark className={markClassName} />
      {wordmark ? <BrandWordmark className={wordmarkClassName} /> : null}
    </Link>
  )
}
