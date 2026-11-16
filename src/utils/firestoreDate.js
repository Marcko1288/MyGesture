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
