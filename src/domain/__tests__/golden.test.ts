/**
 * Test di confronto: le nuove funzioni di dominio devono dare gli stessi risultati dell'app storica
 * (codice originale copiato in __legacy__) su dati generati con molti formati e casi limite,
 * ripetuti su diverse date "oggi". Le differenze volute sono testate a parte (changes.test.ts).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as legacy from '../__legacy__/calculations.js'
import { determineNewCategory as legacyCategory } from '../__legacy__/utils.js'
import { balanceHistory, balanceSummary, periodBalances, periodDeltas } from '../cash'
import { buysOfGroup, buysToDelete, expensesByGroup, groupTotals, yearEndBalance, yearlyExpenses } from '../buys'
import { recurringDates } from '../recurrence'
import { categoryRecords, categoryTrend, monthSummary, statementBreakdown, type Direction } from '../bank'
import { parseAmount, parseBankDate } from '../bankImport'
import { determineNewCategory } from '../categories'
import { addMonths, monthKey, previousMonthKey } from '../dates'
import { filterSubscriptions, renewalOf } from '../subscriptions'
import { edgeBuys, makeBank, makeBuys, makeCash, makeGroups, makeSubscriptions, random, TODAYS } from './fixtures'
import type { Buy } from '../types'

const SEEDS = [1, 2, 3, 42, 1288]
const close = (value: number | null) => (value === null ? null : Math.round(value * 100) / 100)

beforeEach(() => vi.useFakeTimers({ toFake: ['Date'] }))
afterEach(() => vi.useRealTimers())

describe.each(TODAYS.map((today) => [today.toISOString(), today] as const))('oggi = %s', (_label, today) => {
  beforeEach(() => vi.setSystemTime(today))

  it.each(SEEDS)('saldo attuale, precedente e variazione (seed %i)', (seed) => {
    const records = makeCash(random(seed), today)
    // Lo store storico ordina per data; a parità di data l'ordine è quello di Firestore (per id del documento).
    const sorted = legacy.sortByMostRecent([...records].sort((a, b) => a.uid.localeCompare(b.uid)))
    const old = legacy.homeView({ latestCash: sorted[0], previousCash: sorted[1] })
    const summary = balanceSummary(records)
    expect(close(summary.total)).toBe(close(old.total))
    expect(close(summary.previousTotal)).toBe(close(old.previousTotal))
    expect(close(summary.delta)).toBe(close(old.delta))
  })

  it.each(SEEDS)('storico saldo mensile/annuale e variazioni (seed %i)', (seed) => {
    const records = makeCash(random(seed), today)
    for (const period of ['monthly', 'yearly'] as const) {
      const old = legacy.periodSavings(records, period)
      const balances = periodBalances(records, period)
      expect(balances.map(({ label, value }) => ({ label, value }))).toEqual(old)
      expect(periodDeltas(balances).map(({ label, value }) => ({ label, value }))).toEqual(legacy.savingsDeltas(old))
    }
    expect(balanceHistory(records).map(({ cash, date, total }) => ({ uid: cash.uid, date, total }))).toEqual(
      legacy.cashHistoryRows(records),
    )
  })

  it.each(SEEDS)("spese dell'anno, per gruppo, esclusi, tutti i gruppi (seed %i)", (seed) => {
    const rng = random(seed)
    const groups = makeGroups(rng)
    const buys = [...makeBuys(rng, groups, today), ...edgeBuys(groups, today)]
    expect(yearlyExpenses(buys, groups, today)).toBe(
      legacy.homeView({ buyRecords: buys, groupRecords: groups }).yearlyExpenses,
    )
    expect(yearlyExpenses(buys, groups, today)).toBe(
      legacy.importYearlyExpenses({ buyRecords: buys, groupRecords: groups }),
    )

    const old = legacy.expensesView({ buyRecords: buys, groupRecords: groups })
    const result = expensesByGroup(buys, groups, today)
    expect(result.included.map(({ id, name, value }) => ({ id, name, value }))).toEqual(old.expenses)
    expect(result.excluded.map(({ id, name, value }) => ({ id, name, value }))).toEqual(old.excludedGroups)
    expect(result.total).toBe(old.total)
    expect(groupTotals(groups, buys, today).map(({ id, value }) => ({ id, total: value }))).toEqual(
      legacy.allGroupsTotals({ groupRecords: groups, buyRecords: buys }),
    )
  })

  it.each(SEEDS)('spese di un gruppo per periodo (seed %i)', (seed) => {
    const rng = random(seed)
    const groups = makeGroups(rng)
    const buys = [...makeBuys(rng, groups, today), ...edgeBuys(groups, today)]
    for (const group of groups) {
      for (const filter of ['all', 'current', 'past', 'future'] as const) {
        const old = legacy.groupBuys({ group, buyRecords: [...buys], filter })
        const result = buysOfGroup(buys, group.uid ?? group.id ?? '', filter, today)
        expect(result.records.map((buy) => buy.uid)).toEqual(old.records.map((buy: Buy) => buy.uid))
        expect(result.total).toBe(old.total)
      }
    }
  })

  it.each(SEEDS)('pareggio di fine anno (seed %i)', async (seed) => {
    const rng = random(seed)
    const groups = makeGroups(rng)
    const buys = makeBuys(rng, groups, today)
    const created: Partial<Buy>[] = []
    const balanced = await legacy.balancePreviousYear({
      groupRecords: groups,
      buyRecords: buys,
      create: async (values: Partial<Buy>) => created.push(values),
    })
    const result = yearEndBalance(groups, buys, today)
    expect(result.balancedGroups).toBe(balanced)
    expect(result.entries).toEqual(created)
  })

  it.each(SEEDS)('estratto conto: categorie, totale, categoria, andamento (seed %i)', (seed) => {
    const records = makeBank(random(seed), today)
    for (const offset of [-6, -1, 0]) {
      const month = addMonths(monthKey(today), offset)
      for (const direction of ['incoming', 'outgoing', 'all'] as Direction[]) {
        const old = legacy.statementView({ bankRecords: records, selectedMonth: month, filter: direction })
        const result = statementBreakdown(records, month, direction)
        expect(result.categories).toEqual(old.expenses)
        expect(close(result.total)).toBe(close(old.total))
        expect(result.records.map((record) => record.uid)).toEqual(
          old.visibleRecords.map((record: { uid: string }) => record.uid),
        )
        for (const category of new Set(old.expenses.map((item: { name: string }) => item.name))) {
          const name = category as string
          expect(categoryRecords(records, name, month, direction).map((record) => record.uid)).toEqual(
            legacy
              .statementCategoryRecords({
                category: name,
                selectedMonth: month,
                filter: direction,
                bankRecords: records,
              })
              .map((record: { uid: string }) => record.uid),
          )
          const trend = categoryTrend(records, name, month, direction)
          const oldTrend = legacy.statementCategoryTrend({
            category: name,
            selectedMonth: month,
            filter: direction,
            bankRecords: records,
          })
          expect(trend.map((item) => close(item.value))).toEqual(
            oldTrend.map((item: { value: number }) => close(item.value)),
          )
          expect(trend.map((item) => item.records.map((record) => record.uid))).toEqual(
            oldTrend.map((item: { records: { uid: string }[] }) => item.records.map((record) => record.uid)),
          )
        }
      }
    }
  })

  it.each(SEEDS)('entrate e uscite del mese scorso (card "Andamento Spese") (seed %i)', (seed) => {
    const records = makeBank(random(seed), today)
    const old = legacy.homeView({ bankRecords: records })
    const summary = monthSummary(records, previousMonthKey(today))
    expect(close(summary.income)).toBe(close(old.previousMonthPositive))
    expect(close(summary.expenses)).toBe(close(old.previousMonthNegative))
  })

  it.each(SEEDS)('abbonamenti: filtri Tutti, Passati, Attivi e rinnovo (seed %i)', (seed) => {
    const subscriptions = makeSubscriptions(random(seed), today)
    for (const filter of ['all', 'past', 'active'] as const) {
      expect(filterSubscriptions(subscriptions, filter, today).map((item) => item.uid)).toEqual(
        legacy
          .subscriptionsView({ subscriptionRecords: subscriptions, filter })
          .map((item: { uid: string }) => item.uid),
      )
    }
    for (const subscription of subscriptions) {
      const { uid: _uid, id: _id, ...expected } = legacy.renew({ ...subscription })
      expect(renewalOf(subscription)).toEqual(expected)
    }
  })
})

describe('spese ricorrenti', () => {
  const rng = random(7)
  const drafts = Array.from({ length: 400 }, () => {
    const start = new Date(
      2025 + rng.int(0, 2),
      rng.int(0, 11),
      rng.int(1, 31),
      rng.int(0, 23),
      rng.pick([0, 15, 30, 59]),
    )
    const end = new Date(start)
    end.setDate(end.getDate() + rng.int(-10, 500))
    const round = rng.pick(['MEN', 'SET', ''])
    const type_round =
      round === 'SET'
        ? rng.pick(['LUN', 'MAR', 'MER', 'GIO', 'VEN', 'SAB', 'DOM', 'XXX'])
        : rng.pick(['DAT', 'INI', 'FIN', ''])
    const asInput = (date: Date) =>
      new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16)
    return { data_valore: asInput(start), data_fine: asInput(end), round, type_round }
  })

  it.each(drafts.map((draft, index) => [index, draft] as const))('bozza %i', (_index, draft) => {
    expect(recurringDates(draft).map((date) => date.toISOString())).toEqual(
      legacy.recurringDates(draft).map((date: Date) => date.toISOString()),
    )
  })

  it('eliminazione: singola o di tutta la serie', () => {
    const series = [
      { uid: 'BUY_ROOT0001', uid_father: 'BUY_ROOT0001' },
      { uid: 'BUY_CHILD001', uid_father: 'BUY_ROOT0001' },
      { uid: 'BUY_CHILD002', uid_father: 'BUY_ROOT0001' },
      { uid: 'BUY_OTHER001', uid_father: '' },
    ] as Buy[]
    for (const buy of series) {
      for (const mode of ['single', 'family'] as const) {
        expect(buysToDelete(buy, series, mode)).toEqual(legacy.buysToDelete(buy, series, mode))
      }
    }
  })
})

describe('import estratto conto: date e importi', () => {
  const values = [
    '1/2/26',
    '12/31/25',
    '2/29/24',
    '01/05/2026',
    ' 3/4/25 ',
    '2026-01-05',
    '',
    null,
    undefined,
    45000,
    45658,
    46000.5,
    1,
    59,
    60,
    61,
    0,
    -3,
    new Date(2026, 0, 5),
    new Date('2026-03-29T00:30:00Z'),
  ]
  it.each(values.map((value) => [String(value), value] as const))('data %s', (_label, value) => {
    expect(parseBankDate(value as never)).toBe(legacy.toBankDate(value))
  })

  const amounts = ['-1,234.56', '1,000', '12.5', '-0.01', 'abc', '', ' 7 ', 15, -2.5, null, '1.234,56', '€ 5']
  it.each(amounts.map((value) => [String(value), value] as const))('importo %s', (_label, value) => {
    expect(parseAmount(value as never)).toBe(legacy.toAmount(value))
  })
})

describe('categorie', () => {
  const rng = random(99)
  const texts = Array.from(
    { length: 200 },
    () =>
      [
        rng.pick(['', 'Accantonamento automatico', 'BONIFICO', 'stipendio novembre', 'Pagamento', 'PENSIONE']),
        rng.pick([
          '',
          'ALD Automotive',
          'aldo cassi',
          'Wellhub',
          'virgin active',
          'Canone di locazione',
          'Supermercato',
        ]),
      ] as const,
  )
  it('stessa categoria delle regole storiche', () => {
    for (const [operation, detail] of texts)
      expect(determineNewCategory(operation, detail)).toBe(legacyCategory(operation, detail))
    expect(determineNewCategory(undefined, undefined)).toBe(legacyCategory(undefined, undefined))
  })
})
