import { toFirestoreDate } from './firestoreDate.js'

export function isCurrentYearToDate(value, today = new Date()) {
  const date = toFirestoreDate(value)
  if (!date) return false

  const startOfYear = new Date(today.getFullYear(), 0, 1)
  const endOfToday = new Date(today)
  endOfToday.setHours(23, 59, 59, 999)

  return date >= startOfYear && date <= endOfToday
}

export function buyPeriod(value, today = new Date()) {
  const date = toFirestoreDate(value)
  if (!date) return null

  const startOfYear = new Date(today.getFullYear(), 0, 1)
  const endOfToday = new Date(today)
  endOfToday.setHours(23, 59, 59, 999)

  if (date < startOfYear) return 'past'
  if (date > endOfToday) return 'future'
  return 'current'
}
