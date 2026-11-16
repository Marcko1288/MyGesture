import { useRef, type KeyboardEvent } from 'react'
import { cn } from './cn'

export interface SegmentedOption<T extends string> {
  value: T
  label: string
}

/** Controllo a segmenti stile iOS (gruppo di scelte esclusive, navigabile con le frecce). */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  label,
  className,
}: {
  options: SegmentedOption<T>[]
  value: T
  onChange: (value: T) => void
  label: string
  className?: string
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([])
  const onKeyDown = (event: KeyboardEvent, index: number) => {
    const delta = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0
    if (!delta) return
    event.preventDefault()
    const next = (index + delta + options.length) % options.length
    onChange(options[next]!.value)
    refs.current[next]?.focus()
  }
  return (
    <div role="radiogroup" aria-label={label} className={cn('flex rounded-[10px] bg-surface-2 p-0.5', className)}>
      {options.map((option, index) => {
        const selected = option.value === value
        return (
          <button
            key={option.value}
            ref={(element) => {
              refs.current[index] = element
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(option.value)}
            onKeyDown={(event) => onKeyDown(event, index)}
            className={cn(
              'min-h-10 flex-1 rounded-[8px] px-1.5 font-semibold whitespace-nowrap transition-colors duration-150',
              options.length > 3 ? 'text-[13px]' : 'text-[14px]',
              selected ? 'bg-surface text-fg shadow-card dark:bg-[#636366]' : 'text-muted',
            )}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
