import { daysBetween, startOfDay, toDate, toMillis } from './dates'
import type { Subscription } from './types'

/** Famiglia di un abbonamento: il capostipite e tutti i suoi rinnovi condividono questo id. */
export function familyOf(subscription: Pick<Subscription, 'uid_father' | 'uid' | 'id'>): string {
  return subscription.uid_father || subscription.uid || subscription.id || ''
}

/** Bozza del rinnovo: da data_fine + 1 giorno per un anno (fino al giorno prima). Comportamento storico. */
export function renewalOf(subscription: Subscription): Partial<Subscription> | null {
  const start = toDate(subscription.data_fine)
  if (!start) return null
  const begin = new Date(start)
  begin.setDate(begin.getDate() + 1)
  const end = new Date(begin)
  end.setFullYear(end.getFullYear() + 1)
  end.setDate(end.getDate() - 1)
  const { uid: _uid, id: _id, ...rest } = subscription
  return { ...rest, uid_father: familyOf(subscription), data_inizio: begin.toISOString(), data_fine: end.toISOString() }
}

const recordId = (subscription: Subscription) => subscription.id ?? subscription.uid

/** Esiste un rinnovo successivo della stessa famiglia (inizio dopo il giorno di scadenza)? */
export function isRenewed(subscription: Subscription, all: Subscription[]): boolean {
  const expiry = toDate(subscription.data_fine)
  if (!expiry) return false
  const family = familyOf(subscription)
  return all.some((candidate) => {
    if (recordId(candidate) === recordId(subscription) || familyOf(candidate) !== family) return false
    const start = toDate(candidate.data_inizio)
    return start !== null && daysBetween(expiry, start) > 0
  })
}

/** Giorni mancanti alla scadenza (0 = scade oggi, negativo = scaduto). */
export function daysLeft(subscription: Subscription, today = new Date()): number | null {
  const expiry = toDate(subscription.data_fine)
  return expiry ? daysBetween(today, expiry) : null
}

export const EXPIRING_WINDOW_DAYS = 30

/**
 * Abbonamenti in scadenza: data_fine tra oggi e oggi + 30 giorni, senza un rinnovo successivo.
 * (Nell'app storica: entro un mese di calendario e contando anche quelli già rinnovati.)
 */
export function expiringSubscriptions(
  subscriptions: Subscription[],
  today = new Date(),
  windowDays = EXPIRING_WINDOW_DAYS,
) {
  return subscriptions
    .map((subscription) => ({ subscription, daysLeft: daysLeft(subscription, today) }))
    .filter(
      (item): item is { subscription: Subscription; daysLeft: number } =>
        item.daysLeft !== null && item.daysLeft >= 0 && item.daysLeft <= windowDays,
    )
    .filter(({ subscription }) => !isRenewed(subscription, subscriptions))
    .sort((a, b) => a.daysLeft - b.daysLeft)
}

export type SubscriptionFilter = 'all' | 'past' | 'active' | 'expiring'

/** Elenco abbonamenti filtrato e ordinato per scadenza. "In scadenza" usa la stessa regola della dashboard. */
export function filterSubscriptions(
  subscriptions: Subscription[],
  filter: SubscriptionFilter,
  today = new Date(),
): Subscription[] {
  const day = startOfDay(today)
  const expiring =
    filter === 'expiring'
      ? new Set(expiringSubscriptions(subscriptions, today).map(({ subscription }) => subscription))
      : null
  return subscriptions
    .filter((subscription) => {
      if (filter === 'all') return true
      const end = toDate(subscription.data_fine)
      if (!end) return false
      if (expiring) return expiring.has(subscription)
      if (filter === 'past') return end < day
      const start = toDate(subscription.data_inizio)
      return (!start || start <= day) && end >= day
    })
    .sort((a, b) => toMillis(a.data_fine) - toMillis(b.data_fine))
}
