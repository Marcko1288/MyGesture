/** La Cloud Function delle notifiche e l'app devono applicare le stesse regole di scadenza. */
import { describe, expect, it } from 'vitest'
import { dueReminders, reminderText, romeDayNumber } from '../../../functions/expiry.js'
import { expiringSubscriptions } from '../subscriptions'
import type { Subscription } from '../types'
import { makeSubscriptions, random, TODAYS } from './fixtures'

describe('notifiche di scadenza (functions/expiry.js)', () => {
  it.each(TODAYS.map((today) => [today.toISOString(), today] as const))(
    'stessi abbonamenti della dashboard a 15/7/1 giorni (oggi = %s)',
    (_label, today) => {
      for (const seed of [1, 2, 3, 4, 5]) {
        const subscriptions = makeSubscriptions(random(seed), today, 60)
        const fromApp = expiringSubscriptions(subscriptions, today, 30)
          .filter(({ daysLeft }) => [15, 7, 1].includes(daysLeft))
          .map(({ subscription, daysLeft }) => [subscription.uid, daysLeft])
        const fromFunction = (
          dueReminders(subscriptions, today) as { subscription: Subscription; remainingDays: number }[]
        ).map(({ subscription, remainingDays }) => [subscription.uid, remainingDays])
        expect(new Set(fromFunction.map(String))).toEqual(new Set(fromApp.map(String)))
      }
    },
  )

  it('conta i giorni nel fuso di Roma anche se il server è in UTC', () => {
    // Scadenza al 24/11 salvata come mezzanotte di Roma = 23/11 23:00 UTC; la function gira il 17/11 alle 9:00 di Roma.
    expect(romeDayNumber(new Date('2026-11-23T23:00:00Z')) - romeDayNumber(new Date('2026-11-17T08:00:00Z'))).toBe(7)
  })

  it('testo della notifica', () => {
    expect(reminderText({ name: 'Netflix' }, 1)).toBe('Netflix scade tra 1 giorno.')
    expect(reminderText({ name: '' }, 7)).toBe('Un abbonamento scade tra 7 giorni.')
  })
})
