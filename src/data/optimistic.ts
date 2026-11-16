import { useCallback } from 'react'
import { useToast } from '../ui/Toast'

/**
 * Salvataggio ottimistico: Firestore applica subito la scrittura alla cache locale (le liste si aggiornano
 * all'istante, anche offline) e la invia al server in background. Qui mostriamo subito la conferma e,
 * se il server la rifiuta, un errore.
 */
export function useOptimisticSave() {
  const toast = useToast()
  return useCallback(
    (write: () => Promise<unknown>, message: string) => {
      toast({ message })
      write().catch((error: unknown) => {
        console.error(error)
        toast({ message: 'Salvataggio non riuscito sul server. Controlla i dati e riprova.', tone: 'error' })
      })
    },
    [toast],
  )
}
