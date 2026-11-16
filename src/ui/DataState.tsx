import type { ReactNode } from 'react'
import type { LoadStatus } from '../data/collectionStore'
import { LoadingLabel } from './Skeleton'
import { ErrorState } from './States'

/**
 * Gestisce i quattro stati di una vista: caricamento (scheletro), errore (con riprova),
 * vuoto (messaggio + azione) e contenuto. L'offline è segnalato dal banner della shell.
 */
export function DataState({
  status,
  onRetry,
  skeleton,
  isEmpty = false,
  empty,
  errorMessage,
  children,
}: {
  status: LoadStatus
  onRetry?: () => void
  skeleton: ReactNode
  isEmpty?: boolean
  empty?: ReactNode
  errorMessage?: string
  children: ReactNode
}) {
  if (status === 'error') return <ErrorState message={errorMessage} onRetry={onRetry} />
  if (status === 'loading') {
    return (
      <>
        <LoadingLabel />
        {skeleton}
      </>
    )
  }
  if (isEmpty && empty) return <>{empty}</>
  return <>{children}</>
}
