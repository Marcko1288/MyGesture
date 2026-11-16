/**
 * Differenze VOLUTE rispetto all'app storica (decise e documentate in docs/PIANO.md).
 * Ogni test mostra il comportamento storico e quello nuovo sullo stesso dato.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as legacy from '../__legacy__/calculations.js'
import { monthSummary } from '../bank'
import { parseBankDate } from '../bankImport'
import { sortCashByMostRecent } from '../cash'
import { previousMonthKey } from '../dates'
import { expiringSubscriptions, filterSubscriptions } from '../subscriptions'
import type { Bank, Cash, Subscription } from '../types'

const stamp = { data_ins: '2026-01-01T00:00:00.000Z', data_modify: '2026-01-01T00:00:00.000Z' }
const today = new Date(2026, 10, 16, 10, 0)

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(today)
})
afterEach(() => vi.useRealTimers())

function bank(values: Partial<Bank>): Bank {
  return {
    uid: 'BANK_X',
    data_valore: new Date(2026, 9, 10, 12).toISOString(),
    operation: '',
    detail: '',
    card: '',
    accounting: '',
    category: '',
    new_category: 'Spese',
    currency: 'EUR',
    amount: 0,
    ...stamp,
    ...values,
  }
}

describe('salvadanaio calcolato su new_category (bug della card "Andamento Spese")', () => {
  const records = [
    // Categoria della banca "storica" ma regole di categorizzazione → Spese: NON è salvadanaio.
    bank({ uid: 'A', category: 'Investimenti, BDR e Salvadanaio', new_category: 'Spese', amount: -50 }),
    // Accantonamento riconosciuto dalle regole: è salvadanaio anche se la banca lo classifica diversamente.
    bank({ uid: 'B', category: 'Altro', new_category: 'Salvadanaio', amount: -300 }),
    bank({ uid: 'C', category: 'Investimenti, BDR e Salvadanaio', new_category: 'Salvadanaio', amount: -200 }),
    bank({ uid: 'D', new_category: ' Salvadanaio ', amount: 20 }),
  ]

  it('storico: usava category', () => {
    expect(legacy.homeView({ bankRecords: records }).previousMonthSavings).toBe(250)
  })

  it('nuovo: usa new_category (−(−300 −200 +20) = 480)', () => {
    expect(monthSummary(records, previousMonthKey(today)).savings).toBe(480)
  })
})

function subscription(uid: string, end: Date, values: Partial<Subscription> = {}): Subscription {
  const start = new Date(end)
  start.setFullYear(start.getFullYear() - 1)
  return {
    uid,
    name: uid,
    amount: 10,
    uid_father: '',
    data_inizio: start.toISOString(),
    data_fine: end.toISOString(),
    ...stamp,
    ...values,
  }
}

describe('abbonamenti in scadenza: entro 30 giorni ed esclusi quelli già rinnovati', () => {
  const day = (offset: number) => new Date(2026, 10, 16 + offset, 0, 0)
  const renewed = subscription('SUB_RENEWED', day(5))
  const renewal = subscription('SUB_RENEWAL', day(5 + 365), {
    uid_father: 'SUB_RENEWED',
    data_inizio: day(6).toISOString(),
  })
  const list = [
    subscription('SUB_TODAY', day(0)),
    subscription('SUB_30', day(30)),
    subscription('SUB_31', day(31)),
    subscription('SUB_YESTERDAY', day(-1)),
    renewed,
    renewal,
  ]

  it('storico: contava i rinnovati e usava un mese di calendario', () => {
    expect(legacy.homeView({ subscriptionRecords: list }).expiringSubscriptions).toBe(3) // TODAY, 30, RENEWED (16/12 = esattamente un mese)
  })

  it('nuovo: lista ordinata per giorni mancanti, senza i rinnovati', () => {
    expect(expiringSubscriptions(list, today).map(({ subscription: item, daysLeft }) => [item.uid, daysLeft])).toEqual([
      ['SUB_TODAY', 0],
      ['SUB_30', 30],
    ])
  })

  it('il filtro "In scadenza" della lista usa la stessa regola', () => {
    expect(filterSubscriptions(list, 'expiring', today).map((item) => item.uid)).toEqual(['SUB_TODAY', 'SUB_30'])
  })

  it('un rinnovo che inizia lo stesso giorno della scadenza non conta come rinnovo successivo', () => {
    const base = subscription('SUB_B', day(3))
    const sameDay = subscription('SUB_B2', day(368), { uid_father: 'SUB_B', data_inizio: day(3).toISOString() })
    expect(expiringSubscriptions([base, sameDay], today).map(({ subscription: item }) => item.uid)).toEqual(['SUB_B'])
  })
})

describe('saldo: a parità di data vince il record inserito per ultimo', () => {
  const cash = (uid: string, data_ins: string): Cash => ({
    uid,
    conto: 1,
    anticipo: 0,
    otherp: 0,
    otherm: 0,
    data_valore: '2026-11-10',
    data_ins,
    data_modify: data_ins,
  })
  it("l'ordine non dipende più dall'id casuale del documento", () => {
    const older = cash('CASH_ZZZZZZZZ', '2026-11-10T08:00:00.000Z')
    const newer = cash('CASH_AAAAAAAA', '2026-11-10T09:00:00.000Z')
    expect(sortCashByMostRecent([older, newer]).map((item) => item.uid)).toEqual(['CASH_AAAAAAAA', 'CASH_ZZZZZZZZ'])
    expect(sortCashByMostRecent([newer, older]).map((item) => item.uid)).toEqual(['CASH_AAAAAAAA', 'CASH_ZZZZZZZZ'])
  })
})

describe('import: le date impossibili diventano errori invece di essere salvate sbagliate', () => {
  it.each(['13/1/26', '1/32/26', '2/30/26', '2/29/25', '31/31/26', '1/5/026'])('%s', (value) => {
    expect(legacy.toBankDate(value)).not.toBeNull() // storico: data "traboccata" in un altro mese/anno
    expect(parseBankDate(value)).toBeNull()
  })
})
