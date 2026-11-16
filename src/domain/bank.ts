import { addMonths, isInMonth, monthKey, previousMonthKey, toDate, toMillis, type MonthKey } from './dates'
import { DEFAULT_CATEGORY } from './categories'
import { toNumber } from './numbers'
import type { Bank } from './types'

export type Direction = 'incoming' | 'outgoing' | 'all'

/** Categoria calcolata del movimento (default "Spese"). */
export function categoryOf(record: Pick<Bank, 'new_category'>): string {
  return record.new_category?.trim() || DEFAULT_CATEGORY
}

/** Entrate = importo ≥ 0, uscite = importo < 0. */
export function matchesDirection(amount: number, direction: Direction): boolean {
  if (direction === 'incoming') return amount >= 0
  if (direction === 'outgoing') return amount < 0
  return true
}

export function sortByDateDesc<T extends { data_valore: Bank['data_valore'] }>(records: T[]): T[] {
  return [...records].sort((a, b) => toMillis(b.data_valore) - toMillis(a.data_valore))
}

function inMonth(records: Bank[], month: MonthKey, direction: Direction) {
  return records.filter(
    (record) => isInMonth(record.data_valore, month) && matchesDirection(toNumber(record.amount), direction),
  )
}

export interface CategoryTotal {
  name: string
  value: number
}

/**
 * Movimenti di un mese per categoria (schermata Conto). I valori per categoria sono in valore assoluto.
 * Totale: somma dei valori assoluti con Entrate/Uscite, somma con segno con Tutto.
 */
export function statementBreakdown(records: Bank[], month: MonthKey, direction: Direction) {
  const monthRecords = inMonth(records, month, direction)
  const byCategory = new Map<string, number>()
  let signedTotal = 0
  for (const record of monthRecords) {
    const amount = toNumber(record.amount)
    signedTotal += amount
    const category = categoryOf(record)
    byCategory.set(category, (byCategory.get(category) ?? 0) + Math.abs(amount))
  }
  const categories: CategoryTotal[] = [...byCategory.entries()]
    .map(([name, value]) => ({ name, value }))
    .filter((item) => item.value > 0)
  const total = direction === 'all' ? signedTotal : categories.reduce((sum, item) => sum + item.value, 0)
  return { categories, total, records: sortByDateDesc(monthRecords) }
}

/** Movimenti di una categoria nel mese, dal più recente. */
export function categoryRecords(records: Bank[], category: string, month: MonthKey, direction: Direction): Bank[] {
  return sortByDateDesc(inMonth(records, month, direction).filter((record) => categoryOf(record) === category))
}

/** Andamento di una categoria negli ultimi `months` mesi fino a `month` incluso (valori assoluti). */
export function categoryTrend(records: Bank[], category: string, month: MonthKey, direction: Direction, months = 4) {
  return Array.from({ length: months }, (_, index) => {
    const key = addMonths(month, index - months + 1)
    const monthRecords = categoryRecords(records, category, key, direction)
    return {
      month: key,
      value: monthRecords.reduce((sum, record) => sum + Math.abs(toNumber(record.amount)), 0),
      records: monthRecords,
    }
  })
}

export const SAVINGS_CATEGORY = 'Salvadanaio'

export interface MonthSummary {
  month: MonthKey
  /** Somma delle entrate (≥ 0). */
  income: number
  /** Somma delle uscite (valore negativo, come nell'app storica). */
  expenses: number
  /** Quanto è finito nel salvadanaio (positivo): −somma dei movimenti con new_category "Salvadanaio". */
  savings: number
  count: number
}

/**
 * Entrate, uscite e salvadanaio di un mese.
 * Correzione rispetto all'app storica: il salvadanaio si calcola su `new_category` (non su `category`).
 */
export function monthSummary(records: Bank[], month: MonthKey): MonthSummary {
  const summary: MonthSummary = { month, income: 0, expenses: 0, savings: 0, count: 0 }
  for (const record of inMonth(records, month, 'all')) {
    const amount = toNumber(record.amount)
    summary.count += 1
    if (amount >= 0) summary.income += amount
    else summary.expenses += amount
    if (categoryOf(record) === SAVINGS_CATEGORY) summary.savings -= amount
  }
  return summary
}

/**
 * Riepilogo per la dashboard: il mese corrente se ha movimenti importati, altrimenti il mese precedente
 * (`isFallback` = true, da dire chiaramente nell'interfaccia).
 */
export function dashboardMonth(records: Bank[], today = new Date()): MonthSummary & { isFallback: boolean } {
  const current = monthSummary(records, monthKey(today))
  if (current.count > 0) return { ...current, isFallback: false }
  return { ...monthSummary(records, previousMonthKey(today)), isFallback: true }
}

/** Ultimi `limit` movimenti (fino a oggi compreso), dal più recente. */
export function recentMovements(records: Bank[], limit = 5, today = new Date()): Bank[] {
  const startOfTomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).getTime()
  return sortByDateDesc(
    records.filter((record) => (toDate(record.data_valore)?.getTime() ?? Infinity) < startOfTomorrow),
  ).slice(0, limit)
}

/**
 * Ordine stabile delle categorie per assegnare i colori dei grafici: il colore segue la categoria,
 * non la sua posizione nel mese. Prima le categorie delle regole, poi "Spese", poi le altre in ordine alfabetico.
 */
export function categoryColorOrder(records: Bank[], ruleCategories: string[]): string[] {
  const seen = new Set(records.map(categoryOf))
  const ordered = [...new Set([...ruleCategories, DEFAULT_CATEGORY])]
  const others = [...seen].filter((name) => !ordered.includes(name)).sort((a, b) => a.localeCompare(b, 'it'))
  return [...ordered, ...others]
}

/** Primo mese con movimenti (per limitare la navigazione tra i mesi). */
export function firstMonthWithData(records: Bank[]): MonthKey | null {
  let first: number | null = null
  for (const record of records) {
    const time = toDate(record.data_valore)?.getTime()
    if (time !== undefined && (first === null || time < first)) first = time
  }
  return first === null ? null : monthKey(new Date(first))
}
