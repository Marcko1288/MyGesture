import { toDate } from './dates'
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
