import * as React from 'react'
import { cn } from '@/lib/utils'

export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, ...props }, ref) => (
  <select
    ref={ref}
    className={cn(
      'h-10 w-full rounded-lg border border-neutral-300 bg-white px-3 text-sm text-neutral-900 focus:border-[#FA6400] focus:outline-none focus:ring-2 focus:ring-[#FA6400]/15',
      className,
    )}
    {...props}
  />
))
Select.displayName = 'Select'
