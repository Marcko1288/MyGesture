import { toDate, toMillis } from './dates'
import { toNumber } from './numbers'
import type { Cash } from './types'

/** Saldo di un record: conto + anticipo + otherp − otherm. */
export function cashTotal(cash: Pick<Cash, 'conto' | 'anticipo' | 'otherp' | 'otherm'>): number {
  return toNumber(cash.conto) + toNumber(cash.anticipo) + toNumber(cash.otherp) - toNumber(cash.otherm)
}

/** Data di riferimento del record (data_valore, in mancanza data_ins). */
export function cashDate(cash: Cash): Date | null {
  return toDate(cash.data_valore ?? cash.data_ins)
}

/**
 * Record ordinati dal più recente per data_valore (come lo store storico).
 * A parità di data vince quello inserito per ultimo (data_ins): nell'app storica l'ordine
 * a parità di data dipendeva dall'id casuale del documento.
 */
export function sortCashByMostRecent(records: Cash[]): Cash[] {
  return [...records].sort(
    (a, b) =>
      toMillis(b.data_valore ?? b.data_ins ?? b.data_modify) - toMillis(a.data_valore ?? a.data_ins ?? a.data_modify) ||
      toMillis(b.data_ins) - toMillis(a.data_ins),
  )
}

export interface BalanceSummary {
  latest: Cash | null
  previous: Cash | null
  total: number | null
  previousTotal: number | null
  delta: number | null
  updatedAt: Date | null
}

/** Saldo attuale (ultimo record), precedente e variazione. */
export function balanceSummary(records: Cash[]): BalanceSummary {
  const [latest = null, previous = null] = sortCashByMostRecent(records)
  const total = latest ? cashTotal(latest) : null
  const previousTotal = previous ? cashTotal(previous) : null
  return {
    latest,
    previous,
    total,
    previousTotal,
    delta: total !== null && previousTotal !== null ? total - previousTotal : null,
    updatedAt: latest ? cashDate(latest) : null,
  }
}

export type BalancePeriod = 'monthly' | 'yearly'

export interface PeriodBalance {
  /** `YYYY-M` (mese 0-based, come lo storico) o `YYYY`. */
  key: string
  label: string
  date: Date
  value: number
  cash: Cash
}

/** Saldo di fine periodo: per ogni mese/anno vale l'ultimo record. Restituisce gli ultimi `limit` periodi. */
export function periodBalances(records: Cash[], period: BalancePeriod, limit = 4): PeriodBalance[] {
  const periods = new Map<string, PeriodBalance>()
  for (const cash of records) {
    const date = cashDate(cash)
    if (!date) continue
    const key = period === 'monthly' ? `${date.getFullYear()}-${date.getMonth()}` : String(date.getFullYear())
    const current = periods.get(key)
    if (!current || date > current.date) {
      const label =
        period === 'monthly'
          ? new Intl.DateTimeFormat('it-IT', { month: 'short', year: '2-digit' }).format(date)
          : String(date.getFullYear())
      periods.set(key, { key, label, date, value: cashTotal(cash), cash })
    }
  }
  return [...periods.values()].sort((a, b) => a.date.getTime() - b.date.getTime()).slice(-limit)
}

/** Variazione di ogni periodo rispetto al precedente. */
export function periodDeltas(balances: PeriodBalance[]): { key: string; label: string; value: number }[] {
  return balances
    .slice(1)
    .map((item, index) => ({ key: item.key, label: item.label, value: item.value - balances[index]!.value }))
}

/** Storico completo (dal più recente) con il totale di ogni record. */
export function balanceHistory(records: Cash[]): { cash: Cash; date: Date | null; total: number }[] {
  return [...records]
    .sort((a, b) => toMillis(b.data_valore ?? b.data_ins) - toMillis(a.data_valore ?? a.data_ins))
    .map((cash) => ({ cash, date: cashDate(cash), total: cashTotal(cash) }))
}
