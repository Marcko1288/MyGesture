import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { cn } from './cn'

export type ButtonVariant = 'primary' | 'secondary' | 'destructive' | 'plain'

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-accent text-on-accent active:opacity-85',
  secondary: 'bg-accent-soft text-accent-strong active:opacity-85',
  destructive: 'bg-negative text-white active:opacity-85 dark:text-black',
  plain: 'bg-transparent text-accent-strong active:opacity-60',
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  icon?: ReactNode
  block?: boolean
}

/** Pulsante con target touch ≥ 44px. */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', icon, block, className, children, type = 'button', ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-[17px] font-semibold transition-opacity duration-150 disabled:opacity-45',
        variants[variant],
        block && 'w-full',
        className,
      )}
      {...props}
    >
      {icon && (
        <span aria-hidden="true" className="text-xl">
          {icon}
        </span>
      )}
      {children}
    </button>
  )
})

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Obbligatoria: è il nome letto dagli screen reader. */
  label: string
  icon: ReactNode
}

export function IconButton({ label, icon, className, type = 'button', ...props }: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={cn(
        'inline-grid size-11 place-items-center rounded-full text-[22px] text-accent-strong active:bg-surface-2 disabled:opacity-45',
        className,
      )}
      {...props}
    >
      <span aria-hidden="true">{icon}</span>
    </button>
  )
}
