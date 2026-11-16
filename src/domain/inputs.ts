import { localDayKey, toDate } from './dates'
import type { DateValue } from './types'

/**
 * Importo digitato dall'utente: accetta `12,50`, `1.234,56`, `13.000`, `1234.5`, `-3`.
 * Con la virgola, o con punti tra gruppi di tre cifre, i punti sono separatori delle migliaia.
 * null se non è un numero.
 */
export function parseAmountInput(value: string): number | null {
  const text = value.replace(/[\s€]/g, '')
  if (!text) return null
  // "13.000" o "1.234.567" senza virgola: i punti separano le migliaia (scrittura italiana).
  const thousandsOnly = /^-?\d{1,3}(\.\d{3})+$/.test(text)
  const normalized = text.includes(',') || thousandsOnly ? text.replaceAll('.', '').replace(',', '.') : text
  if (!/^-?\d*(\.\d+)?$/.test(normalized) || normalized === '-' || normalized === '') return null
  const amount = Number(normalized)
  return Number.isFinite(amount) ? Math.round(amount * 100) / 100 : null
}

/** Importo per un campo di testo: `12,5` (senza separatore delle migliaia, così si modifica facilmente). */
export function formatAmountInput(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) return ''
  return String(Number(value)).replace('.', ',')
}

/** Valore per `<input type="date">` (giorno locale). */
export function toDateInput(value: DateValue): string {
  const date = toDate(value)
  return date ? localDayKey(date) : ''
}

/**
 * Da `<input type="date">` a ISO. Se `previous` cade nello stesso giorno ne mantiene l'ora
 * (così modificare una spesa non ne sposta l'orario), altrimenti usa `hour` (default mezzogiorno).
 */
export function fromDateInput(day: string, previous?: DateValue, hour = 12): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day)
  if (!match) return null
  const [, year, month, date] = match.map(Number) as [number, number, number, number]
  const before = toDate(previous)
  if (before && localDayKey(before) === day) return before.toISOString()
  return new Date(year, month - 1, date, hour).toISOString()
}

/** Mezzanotte locale del giorno, come salvavano le date degli abbonamenti nell'app storica. */
export function startOfDayIso(day: string): string | null {
  return fromDateInput(day, undefined, 0)
}
