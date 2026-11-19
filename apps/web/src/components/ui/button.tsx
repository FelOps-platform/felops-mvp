import { cva, type VariantProps } from 'class-variance-authority'
import * as React from 'react'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#495CCA]/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#08080A] disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary: 'bg-[#495CCA] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] hover:bg-[#3345B0]',
        accent: 'bg-[#FF6400] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.14)] hover:bg-[#E95B00]',
        contrast:
          'bg-white text-[#171717] shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] hover:bg-[#F5F5F5]',
        secondary: 'border border-neutral-300 bg-white text-neutral-800 hover:bg-neutral-50',
        'outline-dark': 'border border-white/15 bg-white/[0.04] text-white hover:bg-white/[0.09]',
        ghost: 'text-neutral-700 hover:bg-neutral-100',
        'ghost-dark': 'text-white/70 hover:bg-white/[0.08] hover:text-white',
        danger: 'border border-red-200 bg-white text-red-700 hover:bg-red-50',
      },
      size: {
        sm: 'h-8 px-3 text-xs',
        md: 'h-10 px-4',
        lg: 'h-11 px-5',
        icon: 'h-9 w-9',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />
  ),
)
Button.displayName = 'Button'

export { buttonVariants }
