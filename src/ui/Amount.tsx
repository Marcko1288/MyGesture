import { formatCurrency, formatSignedCurrency, spokenAmount } from '../domain/format'
import { cn } from './cn'

const sizes = {
  sm: 'text-[15px] font-medium',
  md: 'text-[17px] font-semibold',
  lg: 'text-[28px] font-bold tracking-tight',
  xl: 'text-[44px] leading-none font-bold tracking-tight',
} as const

export interface AmountProps {
  value: number | null | undefined
  size?: keyof typeof sizes
  /**
   * `plain`: colore del testo; `delta`: variazione con segno, verde se positiva e rossa se negativa;
   * `signed`: segno esplicito ma colore neutro.
   */
  tone?: 'plain' | 'delta' | 'signed' | 'muted'
  currency?: string
  className?: string
}

/** Importo in euro formato it-IT, letto correttamente dagli screen reader. */
export function Amount({ value, size = 'md', tone = 'plain', currency, className }: AmountProps) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return (
      <span className={cn('tabular', sizes[size], 'text-muted', className)}>
        <span aria-hidden="true">—</span>
        <span className="sr-only">non disponibile</span>
      </span>
    )
  }
  const text = tone === 'delta' || tone === 'signed' ? formatSignedCurrency(value) : formatCurrency(value, currency)
  const color =
    tone === 'delta'
      ? value > 0
        ? 'text-positive'
        : value < 0
          ? 'text-negative'
          : 'text-muted'
      : tone === 'muted'
        ? 'text-muted'
        : ''
  const spoken = `${tone === 'delta' && value > 0 ? 'più ' : ''}${spokenAmount(value)}`
  return (
    <span className={cn('tabular whitespace-nowrap', sizes[size], color, className)}>
      <span aria-hidden="true">{text}</span>
      <span className="sr-only">{spoken}</span>
    </span>
  )
}
