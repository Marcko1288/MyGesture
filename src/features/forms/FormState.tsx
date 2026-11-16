import type { ReactNode } from 'react'
import type { LoadStatus } from '../../data/collectionStore'
import { Button, EmptyState, ErrorState, SkeletonCard } from '../../ui'

export interface FormProps {
  /** Id del record da modificare; assente per un nuovo record. */
  id?: string
  /** Id del <form>, usato dal pulsante "Salva" nel piede del foglio. */
  formId: string
  /** Chiude il foglio. */
  onDone: () => void
}

/** Per i fogli di modifica: attende il record, o spiega che non esiste più. */
export function FormState({
  id,
  status,
  found,
  onDone,
  children,
}: {
  id?: string
  status: LoadStatus
  found: boolean
  onDone: () => void
  children: ReactNode
}) {
  if (!id) return <>{children}</>
  if (status === 'loading') return <SkeletonCard lines={4} />
  if (status === 'error') return <ErrorState />
  if (!found) {
    return (
      <EmptyState
        title="Elemento non trovato"
        message="Potrebbe essere stato eliminato, anche da un altro dispositivo."
        action={<Button onClick={onDone}>Chiudi</Button>}
      />
    )
  }
  return <>{children}</>
}
