// @ts-nocheck
/**
 * Calcoli dell'app storica (main, commit 4dee40a), estratti dalle viste SENZA modificarne la logica:
 * cambia solo l'involucro (funzione con parametri invece di variabili nel corpo del componente).
 * Servono come riferimento nei test di confronto. Non modificare.
 */
import * as XLSX from 'xlsx'
import { buyPeriod, isCurrentYearToDate, toFirestoreDate } from './utils.js'

// --- store/firestoreStore.jsx ---
function timestampValue(value) {
  if (typeof value?.toMillis === 'function') return value.toMillis()
  return toFirestoreDate(value)?.getTime() ?? 0
}
export function sortByMostRecent(records) {
  return records.sort(
    (a, b) =>
      timestampValue(b.data_valore ?? b.data_ins ?? b.data_modify) -
      timestampValue(a.data_valore ?? a.data_ins ?? a.data_modify),
  )
}

// --- view/HomeView.jsx ---
export function homeView({
  latestCash,
  previousCash,
  buyRecords = [],
  groupRecords = [],
  bankRecords = [],
  subscriptionRecords = [],
}) {
  const toNumber = (value) => Number(value) || 0
  const cashTotal = (cash) =>
    cash ? toNumber(cash.conto) + toNumber(cash.anticipo) + toNumber(cash.otherp) - toNumber(cash.otherm) : null

  const total = cashTotal(latestCash)
  const previousTotal = cashTotal(previousCash)
  const delta = total !== null && previousTotal !== null ? total - previousTotal : null
  const includedGroupIds = new Set(
    groupRecords.filter((group) => group.all === true).map((group) => group.uid ?? group.id),
  )
  const yearlyExpenses = buyRecords
    .filter((buy) => {
      return isCurrentYearToDate(buy.data_valore) && includedGroupIds.has(buy.group)
    })
    .reduce((sum, buy) => sum + toNumber(buy.amount), 0)
  const previousMonthStart = new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1)
  const previousMonthEnd = new Date(new Date().getFullYear(), new Date().getMonth(), 0, 23, 59, 59, 999)
  const previousMonthBankRecords = bankRecords.filter((record) => {
    const date = toFirestoreDate(record.data_valore)
    return date && date >= previousMonthStart && date <= previousMonthEnd
  })
  const previousMonthPositive = previousMonthBankRecords
    .filter((record) => toNumber(record.amount) >= 0)
    .reduce((sum, record) => sum + toNumber(record.amount), 0)
  const previousMonthNegative = previousMonthBankRecords
    .filter((record) => toNumber(record.amount) < 0)
    .reduce((sum, record) => sum + toNumber(record.amount), 0)
  const previousMonthSavings =
    previousMonthBankRecords
      .filter((record) => String(record.category).trim() === 'Investimenti, BDR e Salvadanaio')
      .reduce((sum, record) => sum + toNumber(record.amount), 0) * -1
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const nextMonth = new Date(today)
  nextMonth.setMonth(nextMonth.getMonth() + 1)
  const expiringSubscriptions = subscriptionRecords.filter((subscription) => {
    const expiryDate = toFirestoreDate(subscription.data_fine)
    return expiryDate && expiryDate >= today && expiryDate <= nextMonth
  }).length
  return {
    total,
    previousTotal,
    delta,
    yearlyExpenses,
    previousMonthPositive,
    previousMonthNegative,
    previousMonthSavings,
    expiringSubscriptions,
  }
}

// --- view/ExpensesView.jsx ---
export function expensesView({ buyRecords = [], groupRecords = [] }) {
  const expenses = groupRecords
    .filter((group) => group.all === true)
    .map((group) => {
      const groupId = group.uid ?? group.id
      const groupBuys = buyRecords.filter((buy) => {
        return buy.group === groupId && isCurrentYearToDate(buy.data_valore)
      })
      if (!groupBuys.length) return null
      const value = groupBuys.reduce((sum, buy) => sum + (Number(buy.amount) || 0), 0)
      return { id: groupId, name: group.name || 'Gruppo senza nome', value }
    })
    .filter(Boolean)
  const excludedGroups = groupRecords
    .filter((group) => group.all === false)
    .map((group) => {
      const groupId = group.uid ?? group.id
      const value = buyRecords
        .filter((buy) => {
          return buy.group === groupId && isCurrentYearToDate(buy.data_valore)
        })
        .reduce((sum, buy) => sum + (Number(buy.amount) || 0), 0)
      return { id: groupId, name: group.name || 'Gruppo senza nome', value }
    })
    .filter((group) => group.value !== 0)
  const total = expenses.reduce((sum, item) => sum + item.value, 0)
  return { expenses, excludedGroups, total }
}

// --- view/AllGroupsView.jsx ---
export function allGroupsTotals({ groupRecords = [], buyRecords = [] }) {
  return groupRecords.map((group) => {
    const id = group.uid ?? group.id
    const total = buyRecords
      .filter((buy) => buy.group === id && isCurrentYearToDate(buy.data_valore))
      .reduce((sum, buy) => sum + (Number(buy.amount) || 0), 0)
    return { id, total }
  })
}

/** Corpo di balancePreviousYear, con buyStore.create sostituito da `create`. */
export async function balancePreviousYear({ groupRecords, buyRecords, create }) {
  const currentYear = new Date().getFullYear()
  const previousYear = currentYear - 1
  let balancedGroups = 0
  for (const group of groupRecords) {
    const groupId = group.uid ?? group.id
    const previousTotal = buyRecords
      .filter((buy) => buy.group === groupId && toFirestoreDate(buy.data_valore)?.getFullYear() === previousYear)
      .reduce((sum, buy) => sum + (Number(buy.amount) || 0), 0)
    if (Math.abs(previousTotal) < 0.001) continue

    await create({
      name: `Pareggio ${previousYear}`,
      amount: -previousTotal,
      data_valore: new Date(previousYear, 11, 31, 12).toISOString(),
      group: groupId,
      icon: group.icon ?? 0,
      repeat: false,
    })
    await create({
      name: `Riporto ${currentYear}`,
      amount: previousTotal,
      data_valore: new Date(currentYear, 0, 1, 12).toISOString(),
      group: groupId,
      icon: group.icon ?? 0,
      repeat: false,
    })
    balancedGroups += 1
  }
  return balancedGroups
}

// --- view/GroupBuysView.jsx ---
export function groupBuys({ group, buyRecords = [], filter }) {
  const records = buyRecords
    .filter(
      (buy) => buy.group === (group.uid ?? group.id) && (filter === 'all' || buyPeriod(buy.data_valore) === filter),
    )
    .sort((a, b) => (toFirestoreDate(b.data_valore)?.getTime() ?? 0) - (toFirestoreDate(a.data_valore)?.getTime() ?? 0))
  const total = records.reduce((sum, buy) => sum + (Number(buy.amount) || 0), 0)
  return { records, total }
}

// --- view/BuyDetailView.jsx ---
export function recurringDates(draft) {
  const start = new Date(draft.data_valore)
  const end = new Date(draft.data_fine)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return []

  const dates = []
  if (draft.round === 'SET') {
    const weekdays = { DOM: 0, LUN: 1, MAR: 2, MER: 3, GIO: 4, VEN: 5, SAB: 6 }
    const targetDay = weekdays[draft.type_round]
    if (targetDay === undefined) return []
    const date = new Date(start)
    date.setDate(date.getDate() + ((targetDay - date.getDay() + 7) % 7))
    while (date <= end) {
      dates.push(new Date(date))
      date.setDate(date.getDate() + 7)
    }
    return dates
  }

  const date = new Date(start.getFullYear(), start.getMonth(), 1, start.getHours(), start.getMinutes())
  while (date <= end) {
    const candidate = new Date(date)
    if (draft.type_round === 'INI') candidate.setDate(1)
    else if (draft.type_round === 'FIN') candidate.setMonth(candidate.getMonth() + 1, 0)
    else
      candidate.setDate(
        Math.min(start.getDate(), new Date(candidate.getFullYear(), candidate.getMonth() + 1, 0).getDate()),
      )
    if (candidate >= start && candidate <= end) dates.push(candidate)
    date.setMonth(date.getMonth() + 1)
  }
  return dates
}

/** Selezione delle spese da eliminare in BuyDetailView.remove. */
export function buysToDelete(buy, buyRecords, mode) {
  const familyId = buy.uid_father || buy.uid
  return mode === 'family'
    ? buyRecords.filter((record) => record.uid === familyId || record.uid_father === familyId)
    : [buy]
}

// --- view/CashDetailView.jsx (Importa Spese) ---
export function importYearlyExpenses({ buyRecords, groupRecords }) {
  const number = (value) => Number(value) || 0
  const includedGroupIds = new Set(
    groupRecords.filter((group) => group.all === true).map((group) => group.uid ?? group.id),
  )
  return buyRecords
    .filter((buy) => isCurrentYearToDate(buy.data_valore) && includedGroupIds.has(buy.group))
    .reduce((sum, buy) => sum + number(buy.amount), 0)
}

// --- view/SavingsView.jsx ---
function cashTotal(cash) {
  const number = (value) => Number(value) || 0
  return number(cash.conto) + number(cash.anticipo) + number(cash.otherp) - number(cash.otherm)
}
export function periodSavings(records, period) {
  const periods = new Map()
  records.forEach((record) => {
    const date = toFirestoreDate(record.data_valore ?? record.data_ins)
    if (!date) return
    const key = period === 'monthly' ? `${date.getFullYear()}-${date.getMonth()}` : String(date.getFullYear())
    const current = periods.get(key)
    if (!current || date > current.date) periods.set(key, { date, value: cashTotal(record) })
  })
  return [...periods.values()]
    .sort((a, b) => a.date - b.date)
    .slice(-4)
    .map(({ date, value }) => ({
      label:
        period === 'monthly'
          ? new Intl.DateTimeFormat('it-IT', { month: 'short', year: '2-digit' }).format(date)
          : String(date.getFullYear()),
      value,
    }))
}
export function savingsDeltas(savings) {
  return savings.slice(1).map((item, index) => ({ label: item.label, value: item.value - savings[index].value }))
}

// --- view/CashHistoryView.jsx ---
export function cashHistoryRows(cashRecords) {
  return [...cashRecords]
    .sort(
      (a, b) =>
        (toFirestoreDate(b.data_valore ?? b.data_ins)?.getTime() ?? 0) -
        (toFirestoreDate(a.data_valore ?? a.data_ins)?.getTime() ?? 0),
    )
    .map((cash) => ({
      uid: cash.uid ?? cash.id,
      date: toFirestoreDate(cash.data_valore ?? cash.data_ins),
      total: cashTotal(cash),
    }))
}

// --- view/StatementView.jsx ---
export function statementView({ bankRecords = [], selectedMonth, filter }) {
  const [year, month] = selectedMonth.split('-').map(Number)
  const previousMonthStart = new Date(year, month - 1, 1)
  const previousMonthEnd = new Date(year, month, 0, 23, 59, 59, 999)
  const byCategory = new Map()
  let signedTotal = 0

  bankRecords.forEach((record) => {
    const date = toFirestoreDate(record.data_valore)
    const amount = Number(record.amount) || 0
    const matchesFilter = filter === 'incoming' ? amount >= 0 : filter === 'outgoing' ? amount < 0 : true
    if (!date || date < previousMonthStart || date > previousMonthEnd || !matchesFilter) return
    signedTotal += amount
    const category = record.new_category?.trim() || 'Spese'
    byCategory.set(category, (byCategory.get(category) || 0) + Math.abs(amount))
  })

  const expenses = [...byCategory.entries()].map(([name, value]) => ({ name, value })).filter((item) => item.value > 0)
  const total = filter === 'all' ? signedTotal : expenses.reduce((sum, item) => sum + item.value, 0)
  const visibleRecords = bankRecords
    .filter((record) => {
      const date = toFirestoreDate(record.data_valore)
      const amount = Number(record.amount) || 0
      const matchesFilter = filter === 'incoming' ? amount >= 0 : filter === 'outgoing' ? amount < 0 : true
      return date && date >= previousMonthStart && date <= previousMonthEnd && matchesFilter
    })
    .sort((a, b) => (toFirestoreDate(b.data_valore)?.getTime() ?? 0) - (toFirestoreDate(a.data_valore)?.getTime() ?? 0))
  return { expenses, total, visibleRecords }
}

// --- view/StatementCategoryView.jsx ---
export function statementCategoryRecords({ category, selectedMonth, filter, bankRecords = [] }) {
  const [year, month] = selectedMonth.split('-').map(Number)
  const start = new Date(year, month - 1, 1)
  const end = new Date(year, month, 0, 23, 59, 59, 999)
  return bankRecords
    .filter((record) => {
      const date = toFirestoreDate(record.data_valore)
      const amount = Number(record.amount) || 0
      const matchesFilter = filter === 'incoming' ? amount >= 0 : filter === 'outgoing' ? amount < 0 : true
      return (
        date && date >= start && date <= end && matchesFilter && (record.new_category?.trim() || 'Spese') === category
      )
    })
    .sort((a, b) => (toFirestoreDate(b.data_valore)?.getTime() ?? 0) - (toFirestoreDate(a.data_valore)?.getTime() ?? 0))
}

// --- view/StatementCategoryTrendView.jsx ---
export function statementCategoryTrend({ category, selectedMonth, filter, bankRecords = [] }) {
  const [year, month] = selectedMonth.split('-').map(Number)
  const endMonth = new Date(year, month - 1, 1)
  const months = Array.from({ length: 4 }, (_, index) => new Date(year, month - 4 + index, 1))
  const records = bankRecords.filter((record) => {
    const date = toFirestoreDate(record.data_valore)
    const amount = Number(record.amount) || 0
    const matchesFilter = filter === 'incoming' ? amount >= 0 : filter === 'outgoing' ? amount < 0 : true
    const matchesCategory = (record.new_category?.trim() || 'Spese') === category
    return (
      date &&
      date >= months[0] &&
      date < new Date(endMonth.getFullYear(), endMonth.getMonth() + 1, 1) &&
      matchesFilter &&
      matchesCategory
    )
  })
  return months.map((start) => {
    const end = new Date(start.getFullYear(), start.getMonth() + 1, 1)
    const monthRecords = records.filter((record) => {
      const date = toFirestoreDate(record.data_valore)
      return date >= start && date < end
    })
    return {
      key: `${start.getFullYear()}-${start.getMonth()}`,
      value: monthRecords.reduce((sum, record) => sum + Math.abs(Number(record.amount) || 0), 0),
      records: monthRecords.sort(
        (a, b) => (toFirestoreDate(b.data_valore)?.getTime() ?? 0) - (toFirestoreDate(a.data_valore)?.getTime() ?? 0),
      ),
    }
  })
}

// --- view/UploadStatementView.jsx ---
export function toBankDate(value) {
  if (value instanceof Date) return value.toISOString()
  if (typeof value === 'number') {
    const date = XLSX.SSF.parse_date_code(value)
    return date ? new Date(date.y, date.m - 1, date.d, 12).toISOString() : null
  }
  const match = String(value ?? '')
    .trim()
    .match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/)
  if (!match) return null
  const [, month, day, yearValue] = match
  const year = yearValue.length === 2 ? 2000 + Number(yearValue) : Number(yearValue)
  const date = new Date(year, Number(month) - 1, Number(day), 12)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

export function toAmount(value) {
  const amount = Number(
    String(value ?? '')
      .replaceAll(',', '')
      .trim(),
  )
  return Number.isFinite(amount) ? amount : null
}

// --- view/SubscriptionsView.jsx ---
const startOfDay = (value = new Date()) => {
  const date = new Date(value)
  date.setHours(0, 0, 0, 0)
  return date
}
export function subscriptionsView({ subscriptionRecords = [], filter }) {
  const today = startOfDay()
  const nextMonth = new Date(today)
  nextMonth.setMonth(nextMonth.getMonth() + 1)
  return subscriptionRecords
    .filter((subscription) => {
      const start = toFirestoreDate(subscription.data_inizio)
      const end = toFirestoreDate(subscription.data_fine)
      if (filter === 'all') return true
      if (!end) return false
      if (filter === 'past') return end < today
      if (filter === 'expiring') return end >= today && end <= nextMonth
      return (!start || start <= today) && end >= today
    })
    .sort((a, b) => (toFirestoreDate(a.data_fine)?.getTime() ?? 0) - (toFirestoreDate(b.data_fine)?.getTime() ?? 0))
}

// --- view/SubscriptionDetailView.jsx (renew) ---
export function renew(subscription) {
  const start = toFirestoreDate(subscription.data_fine)
  if (!start) return null
  start.setDate(start.getDate() + 1)
  const end = new Date(start)
  end.setFullYear(end.getFullYear() + 1)
  end.setDate(end.getDate() - 1)
  return {
    ...subscription,
    uid: undefined,
    id: undefined,
    uid_father: subscription.uid_father || subscription.uid || subscription.id,
    data_inizio: start.toISOString(),
    data_fine: end.toISOString(),
  }
}
