import type { DateValue } from './types'

/** Converte qualunque formato di data salvato su Firestore in Date (o null se non valido). */
export function toDate(value: DateValue | unknown): Date | null {
  if (!value) return null
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value
  if (typeof value === 'object') {
    const candidate = value as Record<string, unknown>
    if (typeof candidate.toDate === 'function') {
      const date = (candidate.toDate as () => Date)()
      return Number.isNaN(date.getTime()) ? null : date
    }
    const seconds = candidate.seconds ?? candidate._seconds
    const nanoseconds = candidate.nanoseconds ?? candidate._nanoseconds ?? 0
    if (Number.isFinite(Number(seconds))) return new Date(Number(seconds) * 1000 + Number(nanoseconds) / 1000000)
  }
  if (typeof value === 'number') return new Date(value < 100000000000 ? value * 1000 : value)
  const date = new Date(value as string)
  return Number.isNaN(date.getTime()) ? null : date
}

/** Millisecondi della data, 0 se non valida (utile per ordinare). */
export function toMillis(value: DateValue | unknown): number {
  return toDate(value)?.getTime() ?? 0
}

export function isCurrentYearToDate(value: DateValue, today = new Date()): boolean {
  return buyPeriod(value, today) === 'current'
}

export type BuyPeriod = 'past' | 'current' | 'future'

export function buyPeriod(value: DateValue, today = new Date()): BuyPeriod | null {
  const date = toDate(value)
  if (!date) return null
  const startOfYear = new Date(today.getFullYear(), 0, 1)
  const endOfToday = new Date(today)
  endOfToday.setHours(23, 59, 59, 999)
  if (date < startOfYear) return 'past'
  if (date > endOfToday) return 'future'
  return 'current'
}

const DAY_MS = 86_400_000

/** Inizio del giorno locale. */
export function startOfDay(value: Date): Date {
  const date = new Date(value)
  date.setHours(0, 0, 0, 0)
  return date
}

/** Numero del giorno di calendario locale (indipendente da ora e ora legale). */
export function dayNumber(date: Date): number {
  return Math.round(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / DAY_MS)
}

/** Giorni di calendario da `from` a `to` (negativo se `to` è nel passato). */
export function daysBetween(from: Date, to: Date): number {
  return dayNumber(to) - dayNumber(from)
}

/** Giorno locale in formato `YYYY-MM-DD`. */
export function localDayKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

/** Mese in formato `YYYY-MM`. */
export type MonthKey = string

export function monthKey(date: Date): MonthKey {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

export function isMonthKey(value: string | null | undefined): value is MonthKey {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(value ?? '')
}

/** Intervallo del mese: `start` incluso, `end` (primo giorno del mese dopo) escluso. */
export function monthBounds(key: MonthKey): { start: Date; end: Date } {
  const [year, month] = key.split('-').map(Number) as [number, number]
  return { start: new Date(year, month - 1, 1), end: new Date(year, month, 1) }
}

export function addMonths(key: MonthKey, months: number): MonthKey {
  const { start } = monthBounds(key)
  return monthKey(new Date(start.getFullYear(), start.getMonth() + months, 1))
}

export function previousMonthKey(today = new Date()): MonthKey {
  return monthKey(new Date(today.getFullYear(), today.getMonth() - 1, 1))
}

export function isInMonth(value: DateValue, key: MonthKey): boolean {
  const date = toDate(value)
  if (!date) return false
  const { start, end } = monthBounds(key)
  return date >= start && date < end
}
