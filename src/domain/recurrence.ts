import { newUid } from './records'
import type { Buy } from './types'

export const WEEKDAYS = { DOM: 0, LUN: 1, MAR: 2, MER: 3, GIO: 4, VEN: 5, SAB: 6 } as const

export interface RecurrenceDraft {
  data_valore: string | Date
  data_fine: string | Date
  round: string
  type_round: string
}

/**
 * Date di una spesa ricorrente (comportamento storico di BuyDetailView):
 * - `SET`: ogni settimana nel giorno `type_round` (LUN…DOM), a partire dal primo utile da data_valore;
 * - altrimenti mensile: `INI` giorno 1, `FIN` ultimo giorno, altro (`DAT`) giorno di data_valore
 *   (limitato all'ultimo del mese). Mantiene l'ora di data_valore; estremi inclusi.
 */
export function recurringDates(draft: RecurrenceDraft): Date[] {
  const start = new Date(draft.data_valore)
  const end = new Date(draft.data_fine)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return []

  const dates: Date[] = []
  if (draft.round === 'SET') {
    const targetDay = WEEKDAYS[draft.type_round as keyof typeof WEEKDAYS]
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
    else {
      const lastDay = new Date(candidate.getFullYear(), candidate.getMonth() + 1, 0).getDate()
      candidate.setDate(Math.min(start.getDate(), lastDay))
    }
    if (candidate >= start && candidate <= end) dates.push(candidate)
    date.setMonth(date.getMonth() + 1)
  }
  return dates
}

/**
 * Spese di una serie ricorrente: il primo record ha uid = uid_father = rootUid, gli altri uid nuovi
 * e uid_father = rootUid (formato storico).
 */
export function buildRecurringSeries(values: Partial<Buy>, dates: Date[], rootUid = newUid('BUY')): Partial<Buy>[] {
  return dates.map((date, index) => ({
    ...values,
    uid: index === 0 ? rootUid : newUid('BUY'),
    uid_father: rootUid,
    data_valore: date.toISOString(),
  }))
}
