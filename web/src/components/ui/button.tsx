import { cva, type VariantProps } from 'class-variance-authority'
import type { ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-xl text-sm font-medium transition disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 focus-visible:ring-emerald-400',
  {
    variants: {
      variant: {
        primary:
          'bg-emerald-400 text-slate-950 shadow-[0_0_40px_-22px_rgba(52,211,153,0.95)] hover:bg-emerald-300',
        secondary: 'bg-slate-900 text-slate-100 ring-1 ring-slate-700 hover:bg-slate-800',
        ghost: 'bg-transparent text-slate-300 hover:bg-slate-900 hover:text-slate-100',
        danger: 'bg-rose-400 text-slate-950 hover:bg-rose-300',
      },
      size: {
        sm: 'h-9 px-3',
        md: 'h-10 px-4',
        lg: 'h-11 px-5',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  },
)

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants>

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return (
    <button className={cn(buttonVariants({ variant, size }), className)} {...props} />
  )
}
