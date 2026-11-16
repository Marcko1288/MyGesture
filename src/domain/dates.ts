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
