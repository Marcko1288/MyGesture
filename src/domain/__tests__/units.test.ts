import { describe, expect, it } from 'vitest'
import * as XLSX from 'xlsx'
import { dashboardMonth, recentMovements, statementBreakdown } from '../bank'
import {
  dedupeKey,
  errorsCsv,
  excelSerialToDay,
  importTotals,
  parseStatementSheet,
  planImport,
  type ParsedRow,
  type Row,
} from '../bankImport'
import { monthlyExpenses, yearEndBalance, yearlyExpenses } from '../buys'
import { defaultCategoryRules, determineNewCategory, normalizeRules, recategorize } from '../categories'
import { addMonths, daysBetween, isMonthKey, monthBounds, toDate } from '../dates'
import { formatCompactEuro, formatCurrency, formatMonth, formatSignedCurrency, spokenAmount } from '../format'
import { createBank, createBuy, createCash, createGroup, createSubscription } from '../records'
import { buildRecurringSeries, recurringDates } from '../recurrence'
import type { Bank, Buy, Group } from '../types'

const stamp = { data_ins: '2026-01-01T00:00:00.000Z', data_modify: '2026-01-01T00:00:00.000Z' }
const nbsp = (value: string) => value.replace(/ /g, ' ')

describe('date', () => {
  it('converte stringhe ISO, YYYY-MM-DD, Timestamp e oggetti {seconds}', () => {
    expect(toDate('2026-11-16T10:00:00.000Z')?.toISOString()).toBe('2026-11-16T10:00:00.000Z')
    expect(toDate({ seconds: 1_700_000_000, nanoseconds: 500_000_000 })?.getTime()).toBe(1_700_000_000_500)
    expect(toDate({ _seconds: 1_700_000_000 })?.getTime()).toBe(1_700_000_000_000)
    expect(toDate({ toDate: () => new Date(5) })?.getTime()).toBe(5)
    expect(toDate(1_700_000_000)?.getTime()).toBe(1_700_000_000_000)
    expect(toDate('non è una data')).toBeNull()
    expect(toDate(null)).toBeNull()
  })

  it('conta i giorni di calendario anche nei cambi di ora legale', () => {
    expect(daysBetween(new Date(2026, 2, 28, 23), new Date(2026, 2, 29, 1))).toBe(1)
    expect(daysBetween(new Date(2026, 9, 24, 12), new Date(2026, 9, 26, 0))).toBe(2)
    expect(daysBetween(new Date(2026, 10, 16), new Date(2026, 10, 15))).toBe(-1)
  })

  it('gestisce i mesi YYYY-MM', () => {
    expect(addMonths('2026-01', -1)).toBe('2025-12')
    expect(addMonths('2026-11', 2)).toBe('2027-01')
    expect(monthBounds('2026-02')).toEqual({ start: new Date(2026, 1, 1), end: new Date(2026, 2, 1) })
    expect(isMonthKey('2026-13')).toBe(false)
    expect(isMonthKey('2026-09')).toBe(true)
  })
})

describe('formattazione', () => {
  it('importi in euro, formato it-IT', () => {
    expect(nbsp(formatCurrency(1234.5))).toBe('1.234,50 €')
    expect(nbsp(formatSignedCurrency(900))).toBe('+900,00 €')
    expect(nbsp(formatSignedCurrency(-12))).toBe('-12,00 €')
    expect(formatCompactEuro(12500)).toBe('12,5k€')
    expect(formatCompactEuro(-950)).toBe('-950€')
    expect(spokenAmount(-12.5)).toBe('meno 12,50 euro')
    expect(formatMonth('2026-10')).toBe('ottobre 2026')
  })
})

describe('record', () => {
  it('uid nel formato storico PREFISSO_ + 8 caratteri', () => {
    expect(createCash().uid).toMatch(/^CASH_[0-9A-F]{8}$/)
    expect(createBuy().uid).toMatch(/^BUY_[0-9A-F]{8}$/)
    expect(createGroup().uid).toMatch(/^GRP_[0-9A-F]{8}$/)
    expect(createBank().uid).toMatch(/^BANK_[0-9A-F]{8}$/)
    expect(createSubscription().uid).toMatch(/^SUB_[0-9A-F]{8}$/)
  })

  it('createBank calcola sempre new_category dalle regole', () => {
    expect(createBank({ operation: 'Accantonamento', new_category: 'Altro' }).new_category).toBe('Salvadanaio')
    expect(createBank({ operation: 'POS' }).new_category).toBe('Spese')
  })

  it('createGroup è incluso nei totali per default', () => {
    expect(createGroup().all).toBe(true)
  })
})

describe('spese', () => {
  const groups: Group[] = [
    { uid: 'GRP_A', name: 'A', icon: 0, all: true, ...stamp },
    { uid: 'GRP_B', name: 'B', icon: 0, all: false, ...stamp },
    { uid: 'GRP_C', name: 'C', icon: 0, ...stamp },
  ]
  const buy = (uid: string, group: string, amount: number, date: Date): Buy => ({
    uid,
    name: uid,
    amount,
    group,
    icon: 0,
    repeat: false,
    uid_father: '',
    round: '',
    type_round: '',
    data_valore: date.toISOString(),
    data_fine: '',
    ...stamp,
  })
  const today = new Date(2026, 3, 20, 9)
  const buys = [
    buy('1', 'GRP_A', 10, new Date(2026, 0, 5)),
    buy('2', 'GRP_A', 20, new Date(2026, 3, 20, 23, 59)),
    buy('3', 'GRP_A', 40, new Date(2026, 3, 21)), // futura: esclusa
    buy('4', 'GRP_B', 80, new Date(2026, 1, 1)), // gruppo escluso
    buy('5', 'GRP_C', 160, new Date(2026, 1, 1)), // gruppo senza "all": escluso
    buy('6', 'GRP_A', 320, new Date(2025, 11, 31, 23, 59)), // anno scorso
  ]

  it("spese dell'anno: solo gruppi all === true, dal 1/1 a oggi", () => {
    expect(yearlyExpenses(buys, groups, today)).toBe(30)
  })

  it("andamento mensile: un valore per mese fino a quello corrente, somma = spese dell'anno", () => {
    const months = monthlyExpenses(buys, groups, today)
    expect(months.map((item) => item.month)).toEqual(['2026-01', '2026-02', '2026-03', '2026-04'])
    expect(months.map((item) => item.value)).toEqual([10, 0, 0, 20])
  })

  it('pareggio: genera pareggio e riporto, e una seconda esecuzione non genera nulla', () => {
    const first = yearEndBalance(groups, buys, today)
    expect(first.entries).toEqual([
      expect.objectContaining({ name: 'Pareggio 2025', amount: -320, group: 'GRP_A' }),
      expect.objectContaining({ name: 'Riporto 2026', amount: 320, group: 'GRP_A' }),
    ])
    const after = [
      ...buys,
      ...first.entries.map((entry, index) => ({ ...buy(`P${index}`, 'GRP_A', 0, new Date()), ...entry }) as Buy),
    ]
    expect(yearEndBalance(groups, after, today).entries).toEqual([])
  })
})

describe('spese ricorrenti', () => {
  it('settimanale dal primo giorno utile', () => {
    const dates = recurringDates({
      data_valore: '2026-11-04T10:00',
      data_fine: '2026-11-30T10:00',
      round: 'SET',
      type_round: 'LUN',
    })
    expect(dates.map((date) => date.getDate())).toEqual([9, 16, 23, 30])
  })

  it('mensile a data fissa, limitata a fine mese', () => {
    const dates = recurringDates({
      data_valore: '2026-01-31T09:00',
      data_fine: '2026-04-30T09:00',
      round: 'MEN',
      type_round: 'DAT',
    })
    expect(dates.map((date) => `${date.getMonth() + 1}/${date.getDate()}`)).toEqual(['1/31', '2/28', '3/31', '4/30'])
  })

  it('la serie ha il capostipite con uid = uid_father', () => {
    const series = buildRecurringSeries(
      { name: 'Affitto', amount: 100 },
      [new Date(2026, 0, 1), new Date(2026, 1, 1)],
      'BUY_ROOT0001',
    )
    expect(series[0]).toMatchObject({ uid: 'BUY_ROOT0001', uid_father: 'BUY_ROOT0001' })
    expect(series[1]?.uid).toMatch(/^BUY_[0-9A-F]{8}$/)
    expect(series[1]?.uid_father).toBe('BUY_ROOT0001')
  })
})

const movement = (values: Partial<Bank>): Bank => ({
  uid: 'BANK_1',
  data_valore: new Date(2026, 9, 10, 12).toISOString(),
  operation: 'POS',
  detail: 'Bar',
  card: '',
  accounting: '',
  category: '',
  new_category: 'Spese',
  currency: 'EUR',
  amount: -2.5,
  ...stamp,
  ...values,
})

describe('estratto conto', () => {
  it('"Tutto" somma con segno, Entrate/Uscite in valore assoluto', () => {
    const records = [movement({ amount: -10 }), movement({ amount: 100, new_category: 'Stipendio' })]
    expect(statementBreakdown(records, '2026-10', 'all').total).toBe(90)
    expect(statementBreakdown(records, '2026-10', 'outgoing').total).toBe(10)
    expect(statementBreakdown(records, '2026-10', 'incoming').categories).toEqual([{ name: 'Stipendio', value: 100 }])
  })

  it('dashboard: mese corrente se ci sono dati, altrimenti il precedente (segnalato)', () => {
    const october = [movement({ amount: 1000 }), movement({ amount: -400 })]
    expect(dashboardMonth(october, new Date(2026, 10, 2))).toMatchObject({
      month: '2026-10',
      isFallback: true,
      income: 1000,
      expenses: -400,
    })
    const withNovember = [...october, movement({ data_valore: new Date(2026, 10, 1, 12).toISOString(), amount: -5 })]
    expect(dashboardMonth(withNovember, new Date(2026, 10, 2))).toMatchObject({
      month: '2026-11',
      isFallback: false,
      expenses: -5,
    })
  })

  it('ultimi movimenti: i più recenti fino a oggi', () => {
    const records = [1, 2, 3, 4, 5, 6, 7].map((day) =>
      movement({ uid: `B${day}`, data_valore: new Date(2026, 10, day, 12).toISOString() }),
    )
    expect(recentMovements(records, 5, new Date(2026, 10, 6, 8)).map((record) => record.uid)).toEqual([
      'B6',
      'B5',
      'B4',
      'B3',
      'B2',
    ])
  })
})

describe('import estratto conto', () => {
  const header: Row = [
    'Data',
    'Operazione',
    'Dettagli',
    'Conto o carta',
    'Contabilizzazione',
    'Categoria',
    'Valuta',
    'Importo',
  ]
  const sheet: Row[] = [
    ['Estratto conto'],
    [],
    header,
    ['11/3/26', 'Pagamento POS', 'Bar', 'Carta', 'Contabilizzato', 'Bar', 'EUR', '-2.50'],
    ['11/3/26', 'Pagamento POS', 'Bar', 'Carta', 'Contabilizzato', 'Bar', 'EUR', '-2.50'],
    ['', '', '', '', '', '', '', ''],
    [46_000, 'Accantonamento', 'Salvadanaio', 'Conto', '', '', 'EUR', '-1,000'],
    ['31/31/26', 'X', '', '', '', '', '', '1'],
    ['11/4/26', 'X', '', '', '', '', '', 'abc'],
  ]

  it('trova l’intestazione, ignora le righe vuote e raccoglie gli errori', () => {
    const result = parseStatementSheet(sheet)!
    expect(result.parsed).toHaveLength(3)
    expect(result.parsed[2]?.record).toMatchObject({ amount: -1000, new_category: 'Salvadanaio' })
    expect(result.errors.map((error) => error.error)).toEqual(['Data non valida', 'Importo non valido'])
    expect(parseStatementSheet([['a', 'b']])).toBeNull()
  })

  it('seriali Excel identici a SheetJS', () => {
    for (let serial = 0; serial < 70_000; serial += 37) {
      const expected = XLSX.SSF.parse_date_code(serial)
      expect(excelSerialToDay(serial), String(serial)).toEqual({ y: expected.y, m: expected.m, d: expected.d })
    }
  })

  it('deduplica con molteplicità (opzione a)', () => {
    const { parsed } = parseStatementSheet(sheet)!
    const coffees = parsed.slice(0, 2)
    const stored = (count: number) => Array.from({ length: count }, () => ({ ...coffees[0]!.record, detail: '  BAR ' }))
    const plan = (count: number) => planImport(coffees, stored(count))
    expect([0, 1, 2, 3].map((count) => plan(count).toImport.length)).toEqual([2, 1, 0, 0])
    expect(plan(1).duplicates).toHaveLength(1)
  })

  it('chiave di deduplica: giorno locale, importo a 2 decimali, testo normalizzato', () => {
    const base = {
      data_valore: new Date(2026, 10, 3, 12).toISOString(),
      amount: -2.5,
      operation: 'Pagamento  POS',
      detail: 'Bar',
    }
    expect(dedupeKey(base)).toBe(
      dedupeKey({ ...base, data_valore: new Date(2026, 10, 3, 0, 30).toISOString(), operation: 'pagamento pos' }),
    )
    expect(dedupeKey(base)).not.toBe(dedupeKey({ ...base, data_valore: new Date(2026, 10, 4, 12).toISOString() }))
    expect(dedupeKey(base)).not.toBe(dedupeKey({ ...base, amount: -2.51 }))
  })

  it('totali entrate/uscite e CSV degli errori', () => {
    const { parsed, errors } = parseStatementSheet(sheet)!
    expect(importTotals(parsed as ParsedRow[])).toEqual({ income: 0, expenses: -1005 })
    const csv = errorsCsv(errors)
    expect(
      csv.startsWith('﻿Data;Operazione;Dettagli;Conto o carta;Contabilizzazione;Categoria;Valuta;Importo;Errore\n'),
    ).toBe(true)
    expect(csv).toContain('"31/31/26";"X";"";"";"";"";"";"1";"Data non valida"')
  })
})

describe('regole di categorizzazione', () => {
  it('regole personalizzate e ricalcolo dei movimenti esistenti', () => {
    const rules = normalizeRules([
      ...defaultCategoryRules,
      { category: ' Bar ', keywords: [' bar ', '', 'bar'] },
      { category: 'Vuota', keywords: [] },
    ])
    expect(rules.at(-1)).toEqual({ category: 'Bar', keywords: ['bar'] })
    expect(determineNewCategory('POS', 'Bar Sport', rules)).toBe('Bar')
    const records = [
      movement({ uid: 'X', detail: 'Bar Sport', new_category: 'Spese' }),
      movement({ uid: 'Y', detail: 'Altro', new_category: 'Spese' }),
    ]
    expect(recategorize(records, rules).map(({ record, from, to }) => [record.uid, from, to])).toEqual([
      ['X', 'Spese', 'Bar'],
    ])
  })
})
