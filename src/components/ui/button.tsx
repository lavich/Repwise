import { cva, type VariantProps } from 'class-variance-authority'
import type { ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

const buttonVariants = cva(
  'inline-flex select-none items-center justify-center gap-2 rounded-2xl font-semibold transition-[transform,opacity,background-color] active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40',
  {
    variants: {
      variant: {
        primary: 'bg-accent text-accent-fg',
        secondary: 'bg-surface-2 text-fg',
        outline: 'border border-border-strong bg-transparent text-fg',
        ghost: 'bg-transparent text-fg active:bg-surface-2',
        danger: 'bg-danger-soft text-danger',
      },
      size: {
        lg: 'h-14 px-6 text-[17px]',
        md: 'h-12 px-5 text-base',
        sm: 'h-11 px-4 text-[15px]',
        icon: 'size-12 shrink-0',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
)

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof buttonVariants>

export function Button({ className, variant, size, type = 'button', ...props }: ButtonProps) {
  return <button type={type} className={cn(buttonVariants({ variant, size }), className)} {...props} />
}
