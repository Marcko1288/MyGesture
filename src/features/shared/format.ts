import { toDate } from '../../domain/dates'
import type { DateValue } from '../../domain/types'

/** `oggi`, `domani`, `tra 5 giorni`, `ieri`, `5 giorni fa`. */
export function relativeDays(days: number): string {
  if (days === 0) return 'oggi'
  if (days === 1) return 'domani'
  if (days === -1) return 'ieri'
  return days > 0 ? `tra ${days} giorni` : `${-days} giorni fa`
}

/** `14 nov` (con l'anno se diverso da quello corrente). */
export function shortDate(value: DateValue, today = new Date()): string {
  const date = toDate(value)
  if (!date) return 'Data non disponibile'
  const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }
  if (date.getFullYear() !== today.getFullYear()) options.year = 'numeric'
  return new Intl.DateTimeFormat('it-IT', options).format(date)
}

/** `lunedì 16 novembre` */
export function longToday(today = new Date()): string {
  return new Intl.DateTimeFormat('it-IT', { weekday: 'long', day: 'numeric', month: 'long' }).format(today)
}

export function percent(value: number, total: number): string {
  if (!total) return '0%'
  return `${new Intl.NumberFormat('it-IT', { maximumFractionDigits: 0 }).format((value / total) * 100)}%`
}
