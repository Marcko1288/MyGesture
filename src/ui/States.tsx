import type { ReactNode } from 'react'
import { FiAlertTriangle, FiInbox } from 'react-icons/fi'
import { Button } from './Button'

/** Stato vuoto: messaggio e azione per iniziare. */
export function EmptyState({
  icon = <FiInbox />,
  title,
  message,
  action,
}: {
  icon?: ReactNode
  title: string
  message?: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center rounded-2xl bg-surface px-6 py-8 text-center shadow-card">
      <span
        aria-hidden="true"
        className="mb-3 grid size-12 place-items-center rounded-full bg-accent-soft text-2xl text-accent-strong"
      >
        {icon}
      </span>
      <h2 className="text-[17px] font-semibold">{title}</h2>
      {message && <p className="mt-1 max-w-xs text-[15px] text-muted">{message}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

/** Stato di errore: messaggio comprensibile e pulsante per riprovare. */
export function ErrorState({
  title = 'Non riesco a caricare i dati',
  message,
  onRetry,
}: {
  title?: string
  message?: string
  onRetry?: () => void
}) {
  return (
    <div role="alert" className="flex flex-col items-center rounded-2xl bg-surface px-6 py-8 text-center shadow-card">
      <span
        aria-hidden="true"
        className="mb-3 grid size-12 place-items-center rounded-full bg-negative/12 text-2xl text-negative"
      >
        <FiAlertTriangle />
      </span>
      <h2 className="text-[17px] font-semibold">{title}</h2>
      <p className="mt-1 max-w-xs text-[15px] text-muted">
        {message ?? 'Controlla la connessione e riprova. I dati già salvati non sono andati persi.'}
      </p>
      {onRetry && (
        <Button variant="secondary" className="mt-4" onClick={onRetry}>
          Riprova
        </Button>
      )}
    </div>
  )
}
