// @ts-nocheck
/* Copia testuale di utils/firestoreDate.js (main, 4dee40a). Non modificare. */
export function toFirestoreDate(value) {
  if (!value) return null
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value
  if (typeof value.toDate === 'function') {
    const date = value.toDate()
    return Number.isNaN(date.getTime()) ? null : date
  }

  if (typeof value === 'object') {
    const seconds = value.seconds ?? value._seconds
    const nanoseconds = value.nanoseconds ?? value._nanoseconds ?? 0
    if (Number.isFinite(Number(seconds))) return new Date(Number(seconds) * 1000 + Number(nanoseconds) / 1000000)
  }

  if (typeof value === 'number') return new Date(value < 100000000000 ? value * 1000 : value)
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

/* Copia testuale di utils/buyDateFilters.js (main, 4dee40a). Non modificare. */

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

/* Copia di class/bank.jsx: regole e determineNewCategory. */
export const categoryRules = [
  { category: 'Salvadanaio', keywords: ['Accantonamento', 'Salvadanaio'] },
  { category: 'Palestra', keywords: ['Virgin', 'Wellhub', 'Fabio Zamuner'] },
  { category: 'Auto', keywords: ['ALD AUTOMOTIVE', 'Ayvens'] },
  { category: 'Affitto', keywords: ['Aldo Cassi', 'CANONE DI LOCAZIONE'] },
  { category: 'Stipendio', keywords: ['Stipendio', 'Pensione'] },
]

/** Determina la categoria dai testi dell'operazione e dei dettagli. */
export function determineNewCategory(operation, detail) {
  const text = `${operation ?? ''} ${detail ?? ''}`.toLocaleLowerCase('it-IT')
  const rule = categoryRules.find(({ keywords }) =>
    keywords.some((keyword) => text.includes(keyword.toLocaleLowerCase('it-IT'))),
  )
  return rule?.category ?? 'Spese'
}
