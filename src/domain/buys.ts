import { buyPeriod, isCurrentYearToDate, monthKey, toDate, toMillis, type BuyPeriod, type MonthKey } from './dates'
import { idOf, toNumber } from './numbers'
import type { Buy, Group } from './types'

/**
 * Gruppi che entrano nei totali: solo `all === true`.
 * Un gruppo senza il campo `all` resta escluso (comportamento storico, confermato).
 */
export function includedGroupIds(groups: Group[]): Set<string> {
  return new Set(groups.filter((group) => group.all === true).map(idOf))
}

const sum = (buys: Buy[]) => buys.reduce((total, buy) => total + toNumber(buy.amount), 0)

/** "Spese dell'anno": dal 1° gennaio a oggi (le future già generate sono escluse), solo gruppi inclusi. */
export function yearlyExpenses(buys: Buy[], groups: Group[], today = new Date()): number {
  const included = includedGroupIds(groups)
  return sum(buys.filter((buy) => included.has(buy.group) && isCurrentYearToDate(buy.data_valore, today)))
}

export interface GroupTotal {
  group: Group
  id: string
  name: string
  value: number
}

const groupName = (group: Group) => group.name || 'Gruppo senza nome'

function yearToDateTotal(group: Group, buys: Buy[], today: Date) {
  const id = idOf(group)
  const groupBuys = buys.filter((buy) => buy.group === id && isCurrentYearToDate(buy.data_valore, today))
  return { id, count: groupBuys.length, value: sum(groupBuys) }
}

/**
 * Spese dell'anno per gruppo (schermata Spese):
 * - `included`: gruppi `all === true` con almeno una spesa nell'anno (anche se il totale è 0);
 * - `excluded`: gruppi `all === false` con totale diverso da 0.
 */
export function expensesByGroup(buys: Buy[], groups: Group[], today = new Date()) {
  const included: GroupTotal[] = []
  const excluded: GroupTotal[] = []
  for (const group of groups) {
    if (group.all !== true && group.all !== false) continue
    const { id, count, value } = yearToDateTotal(group, buys, today)
    if (group.all === true && count > 0) included.push({ group, id, name: groupName(group), value })
    if (group.all === false && value !== 0) excluded.push({ group, id, name: groupName(group), value })
  }
  return { included, excluded, total: included.reduce((total, item) => total + item.value, 0) }
}

/** Totale dell'anno di ogni gruppo (elenco "Tutti i gruppi"). */
export function groupTotals(groups: Group[], buys: Buy[], today = new Date()): GroupTotal[] {
  return groups.map((group) => {
    const { id, value } = yearToDateTotal(group, buys, today)
    return { group, id, name: groupName(group), value }
  })
}

export type BuyFilter = 'all' | BuyPeriod

/** Spese di un gruppo per periodo (Tutto / Anno corrente / Passati / Futuri), dalla più recente. */
export function buysOfGroup(buys: Buy[], groupId: string, filter: BuyFilter, today = new Date()) {
  const records = buys
    .filter((buy) => buy.group === groupId && (filter === 'all' || buyPeriod(buy.data_valore, today) === filter))
    .sort((a, b) => toMillis(b.data_valore) - toMillis(a.data_valore))
  return { records, total: sum(records) }
}

/** Andamento mensile delle spese dell'anno (gruppi inclusi), da gennaio al mese corrente. */
export function monthlyExpenses(
  buys: Buy[],
  groups: Group[],
  today = new Date(),
): { month: MonthKey; value: number }[] {
  const included = includedGroupIds(groups)
  const months = Array.from({ length: today.getMonth() + 1 }, (_, index) => ({
    month: monthKey(new Date(today.getFullYear(), index, 1)),
    value: 0,
  }))
  for (const buy of buys) {
    if (!included.has(buy.group) || !isCurrentYearToDate(buy.data_valore, today)) continue
    const date = toDate(buy.data_valore)!
    months[date.getMonth()]!.value += toNumber(buy.amount)
  }
  return months
}

/** Spese da eliminare: solo questa, oppure tutta la serie ricorrente (stessa famiglia). */
export function buysToDelete(buy: Buy, buys: Buy[], mode: 'single' | 'family'): Buy[] {
  if (mode === 'single') return [buy]
  const familyId = buy.uid_father || buy.uid
  return buys.filter((record) => record.uid === familyId || record.uid_father === familyId)
}

/**
 * Pareggio di fine anno: per ogni gruppo con saldo dell'anno precedente ≠ 0 crea
 * "Pareggio {anno-1}" (−totale, 31/12 alle 12) e "Riporto {anno}" (+totale, 1/1 alle 12).
 * È idempotente: dopo un pareggio il totale dell'anno precedente vale 0 e il gruppo non genera altro.
 */
export function yearEndBalance(groups: Group[], buys: Buy[], today = new Date()) {
  const currentYear = today.getFullYear()
  const previousYear = currentYear - 1
  const entries: Partial<Buy>[] = []
  let balancedGroups = 0
  for (const group of groups) {
    const groupId = idOf(group)
    const previousTotal = sum(
      buys.filter((buy) => buy.group === groupId && toDate(buy.data_valore)?.getFullYear() === previousYear),
    )
    if (Math.abs(previousTotal) < 0.001) continue
    const common = { group: groupId, icon: group.icon ?? 0, repeat: false }
    entries.push(
      {
        ...common,
        name: `Pareggio ${previousYear}`,
        amount: -previousTotal,
        data_valore: new Date(previousYear, 11, 31, 12).toISOString(),
      },
      {
        ...common,
        name: `Riporto ${currentYear}`,
        amount: previousTotal,
        data_valore: new Date(currentYear, 0, 1, 12).toISOString(),
      },
    )
    balancedGroups += 1
  }
  return { previousYear, entries, balancedGroups }
}
