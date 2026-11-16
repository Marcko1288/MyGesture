import { useCallback, useMemo, useSyncExternalStore } from 'react'
import type { Bank, Buy, Cash, CollectionName, Group, Subscription } from '../domain/types'
import { toDate } from '../domain/dates'
import { getCollectionState, retryCollection, subscribeCollection, type CollectionState } from './collectionStore'
import { useUserId } from './auth'

export interface CollectionResult<T> extends CollectionState<T> {
  /** Riprova dopo un errore. */
  retry: () => void
}

/** Dati di una collezione dell'utente corrente, aggiornati in tempo reale. */
export function useCollection<T>(name: CollectionName): CollectionResult<T> {
  const userId = useUserId()
  const subscribe = useCallback((listener: () => void) => subscribeCollection(userId, name, listener), [userId, name])
  const getSnapshot = useCallback(() => getCollectionState<T>(userId, name), [userId, name])
  const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
  const retry = useCallback(() => retryCollection(userId, name), [userId, name])
  return useMemo(() => ({ ...state, retry }), [state, retry])
}

/** Record Cash ordinati dal più recente (per data_valore). */
export const useCash = () => useCollection<Cash>('Cash')
export const useBuys = () => useCollection<Buy>('Buy')
export const useGroups = () => useCollection<Group>('Group')
export const useSubscriptions = () => useCollection<Subscription>('Subscription')

export interface DateRange {
  /** Incluso. */
  from?: Date
  /** Escluso. */
  to?: Date
}

/**
 * Movimenti dell'estratto conto, opzionalmente filtrati per periodo.
 * Il filtro è lato client perché data_valore può essere stringa ISO o Timestamp
 * (una query per intervallo su Firestore non li confronterebbe correttamente).
 */
export function useBankRecords(range?: DateRange): CollectionResult<Bank> {
  const state = useCollection<Bank>('Bank')
  const from = range?.from?.getTime()
  const to = range?.to?.getTime()
  const data = useMemo(() => {
    if (from === undefined && to === undefined) return state.data
    return state.data.filter((record) => {
      const time = toDate(record.data_valore)?.getTime()
      if (time === undefined) return false
      return (from === undefined || time >= from) && (to === undefined || time < to)
    })
  }, [state.data, from, to])
  return useMemo(() => ({ ...state, data }), [state, data])
}

/** Intervallo di un mese `YYYY-MM` (dal giorno 1 incluso al mese successivo escluso). */
export function monthRange(month: string): DateRange {
  const [year, monthNumber] = month.split('-').map(Number)
  return { from: new Date(year!, monthNumber! - 1, 1), to: new Date(year!, monthNumber!, 1) }
}
