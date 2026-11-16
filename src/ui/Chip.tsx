import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from './cn'

/** Chip selezionabile con icona (es. scelta di gruppo o categoria). */
export function Chip({
  selected,
  icon,
  children,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { selected?: boolean; icon?: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={cn(
        'inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border px-4 text-[15px] font-medium transition-colors duration-150',
        selected ? 'border-transparent bg-accent text-on-accent' : 'border-line bg-surface text-fg',
        className,
      )}
      {...props}
    >
      {icon && (
        <span aria-hidden="true" className="text-lg">
          {icon}
        </span>
      )}
      {children}
    </button>
  )
}
