import { useSyncExternalStore } from 'react'
import { FiWifiOff } from 'react-icons/fi'

function subscribe(listener: () => void) {
  window.addEventListener('online', listener)
  window.addEventListener('offline', listener)
  return () => {
    window.removeEventListener('online', listener)
    window.removeEventListener('offline', listener)
  }
}

export function useOnline(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    () => true,
  )
}

/** Banner discreto quando manca la rete: i dati mostrati sono quelli salvati sul dispositivo. */
export function OfflineBanner() {
  const online = useOnline()
  if (online) return null
  return (
    <div
      role="status"
      className="sticky top-0 z-30 -mx-4 mb-2 flex items-center justify-center gap-2 bg-warning/15 px-4 py-2 text-[13px] font-medium text-warning backdrop-blur"
    >
      <FiWifiOff aria-hidden="true" />
      Sei offline: vedi gli ultimi dati salvati, le modifiche verranno inviate al ritorno della rete.
    </div>
  )
}
