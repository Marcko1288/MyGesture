/**
 * Regole delle notifiche di scadenza, senza dipendenze da Firebase (testabili).
 * Devono restare allineate a src/domain/subscriptions.ts (stessa definizione di rinnovo e di giorni mancanti).
 */
const TIME_ZONE = 'Europe/Rome'
const DAYS_BEFORE = [15, 7, 1]

function toDate(value) {
  if (!value) return null
  if (typeof value.toDate === 'function') return value.toDate()
  const seconds = value.seconds ?? value._seconds
  if (typeof value === 'object' && Number.isFinite(Number(seconds))) {
    return new Date(Number(seconds) * 1000 + Number(value.nanoseconds ?? value._nanoseconds ?? 0) / 1e6)
  }
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

const romeDayFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

/**
 * Numero del giorno di calendario a Roma (giorni dall'epoch).
 * Le date sono salvate come mezzanotte locale (es. 2026-12-01T23:00:00Z = 2 dicembre):
 * calcolarle nel fuso del server (UTC) le spostava di un giorno.
 */
function romeDayNumber(date) {
  const [year, month, day] = romeDayFormatter.format(date).split('-').map(Number)
  return Math.round(Date.UTC(year, month - 1, day) / 86400000)
}

function familyOf(subscription) {
  return subscription.uid_father || subscription.uid || subscription.id
}

const recordId = (subscription) => subscription.id ?? subscription.uid

/** Esiste un rinnovo della stessa famiglia che inizia dopo il giorno di scadenza? */
function isRenewed(subscription, subscriptions) {
  const expiryDate = toDate(subscription.data_fine)
  if (!expiryDate) return false
  const expiry = romeDayNumber(expiryDate)
  const family = familyOf(subscription)
  return subscriptions.some((candidate) => {
    const start = toDate(candidate.data_inizio)
    return (
      recordId(candidate) !== recordId(subscription) &&
      familyOf(candidate) === family &&
      start &&
      romeDayNumber(start) > expiry
    )
  })
}

/** Abbonamenti da notificare oggi: non rinnovati e a 15, 7 o 1 giorno dalla scadenza. */
function dueReminders(subscriptions, now = new Date(), daysBefore = DAYS_BEFORE) {
  const today = romeDayNumber(now)
  return subscriptions.flatMap((subscription) => {
    const expiryDate = toDate(subscription.data_fine)
    if (!expiryDate) return []
    const remainingDays = romeDayNumber(expiryDate) - today
    if (!daysBefore.includes(remainingDays) || isRenewed(subscription, subscriptions)) return []
    return [{ subscription, remainingDays }]
  })
}

function reminderText(subscription, remainingDays) {
  return `${subscription.name || 'Un abbonamento'} scade tra ${remainingDays} ${remainingDays === 1 ? 'giorno' : 'giorni'}.`
}

module.exports = { TIME_ZONE, DAYS_BEFORE, toDate, romeDayNumber, familyOf, isRenewed, dueReminders, reminderText }
