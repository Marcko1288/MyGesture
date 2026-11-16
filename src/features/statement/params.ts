import { useSearchParams } from 'react-router-dom'
import { isMonthKey, previousMonthKey, type MonthKey } from '../../domain/dates'
import type { Direction } from '../../domain/bank'

const toParam: Record<Direction, string> = { outgoing: 'uscite', incoming: 'entrate', all: 'tutto' }
const fromParam: Record<string, Direction> = { uscite: 'outgoing', entrate: 'incoming', tutto: 'all' }

export const directionLabels: Record<Direction, string> = { outgoing: 'Uscite', incoming: 'Entrate', all: 'Tutto' }

/** Mese (`?mese=YYYY-MM`, default mese precedente) e tipo (`?tipo=uscite|entrate|tutto`) dall'URL. */
export function useStatementParams() {
  const [params, setParams] = useSearchParams()
  const month: MonthKey = isMonthKey(params.get('mese')) ? params.get('mese')! : previousMonthKey()
  const direction: Direction = fromParam[params.get('tipo') ?? ''] ?? 'outgoing'
  const search = (next: { month?: MonthKey; direction?: Direction } = {}) =>
    new URLSearchParams({ mese: next.month ?? month, tipo: toParam[next.direction ?? direction] }).toString()
  const update = (next: { month?: MonthKey; direction?: Direction }) => setParams(search(next), { replace: true })
  return { month, direction, search, update }
}
