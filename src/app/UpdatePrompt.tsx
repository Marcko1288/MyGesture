import { useEffect } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { useToast } from '../ui'

const CHECK_INTERVAL_MS = 60 * 60 * 1000

/**
 * Registra il service worker e, quando è pronta una nuova versione dell'app, propone "Aggiorna"
 * (l'aggiornamento non interrompe mai un inserimento in corso).
 */
export default function UpdatePrompt() {
  const toast = useToast()
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      if (!registration) return
      // Controllo periodico e al ritorno in primo piano: su iOS l'app installata resta aperta a lungo.
      setInterval(() => registration.update().catch(() => undefined), CHECK_INTERVAL_MS)
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') registration.update().catch(() => undefined)
      })
    },
  })

  useEffect(() => {
    if (!needRefresh) return
    toast({
      message: 'È disponibile una nuova versione di My Gesture.',
      tone: 'info',
      duration: 24 * 60 * 60 * 1000,
      action: { label: 'Aggiorna', onAction: () => updateServiceWorker(true) },
    })
  }, [needRefresh, toast, updateServiceWorker])

  return null
}
