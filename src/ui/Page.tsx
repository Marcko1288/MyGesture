import type { ReactNode } from 'react'
import { FiChevronLeft } from 'react-icons/fi'
import { cn } from './cn'

/**
 * Intestazione di schermata stile iOS: titolo grande, eventuale "indietro" e azioni a destra.
 * Rispetta la safe area superiore (notch / Dynamic Island).
 */
export function Page({
  title,
  subtitle,
  back,
  actions,
  children,
  className,
}: {
  title: ReactNode
  subtitle?: ReactNode
  back?: { label: string; onClick: () => void }
  actions?: ReactNode
  children?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('pb-4', className)}>
      <header className="pt-2">
        <div className="flex min-h-11 items-center justify-between gap-2">
          {back ? (
            <button
              type="button"
              onClick={back.onClick}
              className="-ml-2 inline-flex min-h-11 items-center pr-2 text-[17px] text-accent-strong"
            >
              <FiChevronLeft aria-hidden="true" className="text-[26px]" />
              {back.label}
            </button>
          ) : (
            <span />
          )}
          {actions && <div className="flex items-center gap-1">{actions}</div>}
        </div>
        <h1 className="mt-1 text-[34px] leading-tight font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-0.5 text-[15px] text-muted">{subtitle}</p>}
      </header>
      <div className="mt-4 flex flex-col gap-3">{children}</div>
    </div>
  )
}
