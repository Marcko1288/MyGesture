import { useRef, useState, type MouseEvent, type PointerEvent, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { FiChevronRight } from 'react-icons/fi'
import { cn } from './cn'

export interface SwipeAction {
  label: string
  icon?: ReactNode
  tone?: 'destructive' | 'accent'
  onAction: () => void
}

const ACTION_WIDTH = 76

/** Contenitore di righe con separatori (lista raggruppata stile iOS). */
export function List({ children, className, label }: { children: ReactNode; className?: string; label?: string }) {
  return (
    <ul aria-label={label} className={cn('overflow-hidden rounded-2xl bg-surface shadow-card', className)}>
      {children}
    </ul>
  )
}

export interface ListRowProps {
  title: ReactNode
  subtitle?: ReactNode
  /** Icona a sinistra (dentro un cerchio colorato). */
  icon?: ReactNode
  iconClassName?: string
  /** Contenuto a destra (es. <Amount/>). */
  trailing?: ReactNode
  to?: string
  onClick?: () => void
  chevron?: boolean
  /** Azioni rivelate con lo swipe verso sinistra (anche raggiungibili da tastiera e screen reader). */
  actions?: SwipeAction[]
  className?: string
}

/** Riga di lista con area di tocco ≥ 44px e swipe per modifica/eliminazione. */
export function ListRow({
  title,
  subtitle,
  icon,
  iconClassName,
  trailing,
  to,
  onClick,
  chevron,
  actions = [],
  className,
}: ListRowProps) {
  const width = actions.length * ACTION_WIDTH
  const [offset, setOffset] = useState(0)
  const [dragging, setDragging] = useState(false)
  const gesture = useRef<{ x: number; y: number; base: number; horizontal: boolean | null } | null>(null)
  const suppressClick = useRef(false)
  const open = offset !== 0

  const onPointerDown = (event: PointerEvent) => {
    if (!width || event.pointerType === 'mouse') return
    gesture.current = { x: event.clientX, y: event.clientY, base: offset, horizontal: null }
  }
  const onPointerMove = (event: PointerEvent) => {
    const current = gesture.current
    if (!current) return
    const dx = event.clientX - current.x
    const dy = event.clientY - current.y
    if (current.horizontal === null && Math.hypot(dx, dy) > 8) current.horizontal = Math.abs(dx) > Math.abs(dy)
    if (!current.horizontal) return
    setDragging(true)
    setOffset(Math.min(0, Math.max(-width - 24, current.base + dx)))
  }
  const onPointerEnd = () => {
    const current = gesture.current
    gesture.current = null
    if (!current?.horizontal) return
    suppressClick.current = true
    setDragging(false)
    setOffset((value) => (value < -width / 2 ? -width : 0))
  }
  const onClickCapture = (event: MouseEvent) => {
    if (suppressClick.current || open) {
      event.preventDefault()
      event.stopPropagation()
      suppressClick.current = false
      if (open && !dragging) setOffset(0)
    }
  }

  const body = (
    <>
      {icon && (
        <span
          aria-hidden="true"
          className={cn(
            'grid size-9 shrink-0 place-items-center rounded-full bg-accent-soft text-lg text-accent-strong',
            iconClassName,
          )}
        >
          {icon}
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[17px]">{title}</span>
        {subtitle && <span className="block truncate text-[14px] text-muted">{subtitle}</span>}
      </span>
      {trailing && <span className="shrink-0 text-right">{trailing}</span>}
      {(chevron ?? Boolean(to)) && <FiChevronRight aria-hidden="true" className="shrink-0 text-lg text-muted" />}
    </>
  )
  const contentClass = 'flex min-h-11 w-full items-center gap-3 bg-surface px-4 py-2.5 text-left active:bg-surface-2'

  return (
    <li className={cn('relative overflow-hidden border-b border-line last:border-b-0', className)}>
      {width > 0 && (
        <div className="absolute inset-y-0 right-0 flex" style={{ width }}>
          {actions.map((action) => (
            <button
              key={action.label}
              type="button"
              onFocus={() => setOffset(-width)}
              onClick={() => {
                setOffset(0)
                action.onAction()
              }}
              className={cn(
                'flex flex-1 flex-col items-center justify-center gap-0.5 text-[13px] font-semibold',
                action.tone === 'destructive' ? 'bg-negative text-white dark:text-black' : 'bg-accent text-on-accent',
              )}
            >
              {action.icon && (
                <span aria-hidden="true" className="text-lg">
                  {action.icon}
                </span>
              )}
              {action.label}
            </button>
          ))}
        </div>
      )}
      <div
        className="relative touch-pan-y"
        style={{ transform: `translateX(${offset}px)`, transition: dragging ? 'none' : 'transform 180ms ease-out' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
        onClickCapture={onClickCapture}
      >
        {to ? (
          <Link to={to} className={contentClass}>
            {body}
          </Link>
        ) : onClick ? (
          <button type="button" onClick={onClick} className={contentClass}>
            {body}
          </button>
        ) : (
          <div className={contentClass}>{body}</div>
        )}
      </div>
    </li>
  )
}
