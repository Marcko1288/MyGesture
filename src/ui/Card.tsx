import type { HTMLAttributes, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { FiChevronRight } from 'react-icons/fi'
import { cn } from './cn'

const base = 'block rounded-2xl bg-surface p-4 shadow-card'

export interface CardProps extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  title?: ReactNode
  /** Rende la card toccabile (link interno). */
  to?: string
  /** Etichetta del link per gli screen reader, se il titolo non basta. */
  linkLabel?: string
  children?: ReactNode
}

/** Superficie a scheda. Con `to` diventa un link con freccia e area di tocco intera. */
export function Card({ title, to, linkLabel, className, children, ...props }: CardProps) {
  const heading = title && (
    <div className="mb-1 flex items-center justify-between gap-2">
      <h2 className="text-[15px] font-semibold text-muted">{title}</h2>
      {to && <FiChevronRight aria-hidden="true" className="text-lg text-muted" />}
    </div>
  )
  if (to) {
    return (
      <Link
        to={to}
        aria-label={linkLabel}
        className={cn(base, 'transition-transform duration-150 active:scale-[0.99]', className)}
      >
        {heading}
        {children}
      </Link>
    )
  }
  return (
    <section className={cn(base, className)} {...props}>
      {heading}
      {children}
    </section>
  )
}

/** Titolo di sezione sopra un gruppo di card o una lista. */
export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mt-6 mb-2 flex items-end justify-between px-1">
      <h2 className="text-[20px] font-bold tracking-tight">{children}</h2>
      {action}
    </div>
  )
}
