import * as React from 'react'
import { cn } from '@/lib/utils'

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'h-10 w-full rounded-md border border-[#D1D5DB] bg-white px-3 text-sm text-[#111827] placeholder:text-[#9CA3AF] focus:border-[#495CCA] focus:outline-none focus:ring-2 focus:ring-[#495CCA]/15 disabled:bg-[#F9FAFB] disabled:text-[#6B7280]',
        className,
      )}
      {...props}
    />
  ),
)
Input.displayName = 'Input'
