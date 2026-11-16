import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { FiAlertCircle, FiCheckCircle } from 'react-icons/fi'
import { cn } from './cn'

export interface ToastOptions {
  message: string
  tone?: 'success' | 'error' | 'info'
  /** Es. "Annulla" dopo un'eliminazione. */
  action?: { label: string; onAction: () => void }
  /** Millisecondi; default 4s (6s se c'è un'azione). */
  duration?: number
  /** Chiamata quando il toast si chiude senza che l'azione sia stata usata. */
  onDismiss?: () => void
}

interface ToastItem extends ToastOptions {
  id: number
}

const ToastContext = createContext<((options: ToastOptions) => void) | null>(null)

export function useToast() {
  const show = useContext(ToastContext)
  if (!show) throw new Error('useToast va usato dentro ToastProvider')
  return show
}

/** Un toast alla volta, sopra la tab bar; annunciato agli screen reader. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastItem | null>(null)
  const counter = useRef(0)
  const current = useRef<ToastItem | null>(null)

  const close = useCallback((item: ToastItem, viaAction: boolean) => {
    if (current.current?.id !== item.id) return
    current.current = null
    setToast(null)
    if (!viaAction) item.onDismiss?.()
  }, [])

  const show = useCallback(
    (options: ToastOptions) => {
      // Il toast precedente si chiude come se fosse scaduto (es. conferma l'eliminazione in sospeso).
      if (current.current) close(current.current, false)
      counter.current += 1
      const item = { ...options, id: counter.current }
      current.current = item
      setToast(item)
    },
    [close],
  )

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => close(toast, false), toast.duration ?? (toast.action ? 6000 : 4000))
    return () => clearTimeout(timer)
  }, [toast, close])

  const value = useMemo(() => show, [show])
  const Icon = toast?.tone === 'error' ? FiAlertCircle : FiCheckCircle

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 z-50 flex justify-center px-4"
        style={{ bottom: 'calc(var(--tabbar-height) + var(--safe-bottom) + 12px)' }}
      >
        {toast && (
          <div
            key={toast.id}
            role={toast.tone === 'error' ? 'alert' : 'status'}
            className="pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-2xl bg-[#1c1c1e] py-2 pr-2 pl-4 text-[15px] text-white shadow-lg motion-safe:animate-toast-in dark:bg-[#3a3a3c]"
          >
            {toast.tone !== 'info' && (
              <Icon
                aria-hidden="true"
                className={cn('shrink-0 text-lg', toast.tone === 'error' ? 'text-[#ff8a8a]' : 'text-[#4ade80]')}
              />
            )}
            <span className="flex-1 py-2">{toast.message}</span>
            {toast.action && (
              <button
                type="button"
                className="min-h-11 rounded-xl px-3 font-semibold text-[#8ab4ff]"
                onClick={() => {
                  toast.action!.onAction()
                  close(toast, true)
                }}
              >
                {toast.action.label}
              </button>
            )}
          </div>
        )}
      </div>
    </ToastContext.Provider>
  )
}
