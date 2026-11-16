import { useEffect, useId, useRef, useState, type PointerEvent, type ReactNode } from 'react'
import { FiX } from 'react-icons/fi'
import { IconButton } from './Button'

/**
 * Foglio dal basso (dialog modale nativo: focus intrappolato, Esc per chiudere).
 * Si chiude toccando lo sfondo o trascinando la maniglia verso il basso.
 */
export function BottomSheet({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  footer?: ReactNode
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const drag = useRef<{ startY: number; pointerId: number } | null>(null)
  const [offset, setOffset] = useState(0)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) {
      dialog.showModal()
      setOffset(0)
    } else if (!open && dialog.open) dialog.close()
  }, [open])

  // Blocca lo scorrimento della pagina sotto il foglio (iOS non lo fa da solo).
  useEffect(() => {
    if (!open) return
    const previous = document.documentElement.style.overflow
    document.documentElement.style.overflow = 'hidden'
    return () => {
      document.documentElement.style.overflow = previous
    }
  }, [open])

  const onPointerDown = (event: PointerEvent) => {
    drag.current = { startY: event.clientY, pointerId: event.pointerId }
    ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
  }
  const onPointerMove = (event: PointerEvent) => {
    if (drag.current) setOffset(Math.max(0, event.clientY - drag.current.startY))
  }
  const onPointerUp = () => {
    if (!drag.current) return
    drag.current = null
    if (offset > 100) onClose()
    else setOffset(0)
  }

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      onClick={(event) => {
        if (event.target === ref.current) onClose()
      }}
      className="m-0 mx-auto mt-auto max-h-[92dvh] w-full max-w-lg overflow-hidden rounded-t-[20px] border-0 bg-surface p-0 text-fg shadow-xl backdrop:bg-[var(--overlay)] open:flex open:flex-col motion-safe:open:animate-sheet-in motion-safe:backdrop:animate-fade-in"
      style={{
        transform: offset ? `translateY(${offset}px)` : undefined,
        transition: drag.current ? 'none' : 'transform 150ms ease-out',
      }}
    >
      <div
        className="shrink-0 cursor-grab touch-none px-4 pt-2"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <div aria-hidden="true" className="mx-auto h-1.5 w-10 rounded-full bg-line" />
        <div className="mt-1 flex items-center justify-between">
          <h2 id={titleId} className="text-[20px] font-bold">
            {title}
          </h2>
          <IconButton label="Chiudi" icon={<FiX />} onClick={onClose} className="-mr-2 text-muted" />
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4">{children}</div>
      {footer && (
        <div
          className="shrink-0 border-t border-line px-4 pt-3"
          style={{ paddingBottom: 'calc(12px + var(--safe-bottom))' }}
        >
          {footer}
        </div>
      )}
      {!footer && <div aria-hidden="true" style={{ height: 'var(--safe-bottom)' }} />}
    </dialog>
  )
}
