import { monthBounds, toDate, type MonthKey } from './dates'
import type { DateValue } from './types'

const currencyFormatters = new Map<string, Intl.NumberFormat>()

function currencyFormatter(currency: string) {
  let formatter = currencyFormatters.get(currency)
  if (!formatter) {
    try {
      formatter = new Intl.NumberFormat('it-IT', { style: 'currency', currency, useGrouping: true })
    } catch {
      formatter = new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', useGrouping: true })
    }
    currencyFormatters.set(currency, formatter)
  }
  return formatter
}

/** `1.234,56 €` (separatore delle migliaia anche sotto 10.000, come la Home storica). */
export function formatCurrency(value: number, currency = 'EUR'): string {
  return currencyFormatter(currency || 'EUR').format(Number(value) || 0)
}

/** `+1.234,56 €` / `-12,00 €` (zero senza segno). */
export function formatSignedCurrency(value: number): string {
  return `${value > 0 ? '+' : ''}${formatCurrency(value)}`
}

/** Formato compatto per gli assi dei grafici: `12,5k€`, `950€`. */
export function formatCompactEuro(value: number): string {
  const absolute = Math.abs(value)
  if (absolute >= 1000) {
    return `${value < 0 ? '-' : ''}${new Intl.NumberFormat('it-IT', { maximumFractionDigits: 1 }).format(absolute / 1000)}k€`
  }
  return `${new Intl.NumberFormat('it-IT', { maximumFractionDigits: 0 }).format(value)}€`
}

/** Testo per gli screen reader: `meno 12,50 euro`. */
export function spokenAmount(value: number): string {
  const number = new Intl.NumberFormat('it-IT', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    useGrouping: true,
  }).format(Math.abs(value))
  return `${value < 0 ? 'meno ' : ''}${number} euro`
}

/** `16/11/2026` */
export function formatDate(value: DateValue): string | null {
  const date = toDate(value)
  return date ? date.toLocaleDateString('it-IT') : null
}

/** `ottobre 2026` */
export function formatMonth(key: MonthKey): string {
  return new Intl.DateTimeFormat('it-IT', { month: 'long', year: 'numeric' }).format(monthBounds(key).start)
}

/** `ott` */
export function formatShortMonth(key: MonthKey): string {
  return new Intl.DateTimeFormat('it-IT', { month: 'short' }).format(monthBounds(key).start)
}
