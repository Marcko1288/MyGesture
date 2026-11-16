import { onSnapshot, type DocumentData, type QuerySnapshot } from 'firebase/firestore'
import { toMillis } from '../domain/dates'
import type { CollectionName } from '../domain/types'
import { userCollection } from './paths'

export type LoadStatus = 'loading' | 'ready' | 'error'

export interface CollectionState<T> {
  status: LoadStatus
  data: T[]
  error: Error | null
  /** true finché i dati arrivano solo dalla cache locale (es. offline). */
  fromCache: boolean
}

interface Entry {
  state: CollectionState<unknown>
  listeners: Set<() => void>
  unsubscribe: (() => void) | null
  releaseTimer: ReturnType<typeof setTimeout> | null
}

/** Dopo l'ultimo componente che smette di usare una collezione, il listener resta attivo ancora un po'
 * per evitare di chiuderlo e riaprirlo a ogni cambio di schermata. */
const RELEASE_DELAY_MS = 30_000
const initialState: CollectionState<never> = { status: 'loading', data: [], error: null, fromCache: true }
const entries = new Map<string, Entry>()

function sortValue(record: Record<string, unknown>) {
  return toMillis(record.data_valore ?? record.data_ins ?? record.data_modify)
}

function toRecords(snapshot: QuerySnapshot<DocumentData>) {
  return snapshot.docs
    .map((document) => ({ id: document.id, ...document.data() }))
    .sort((a, b) => sortValue(b) - sortValue(a))
}

function keyOf(userId: string, name: CollectionName) {
  return `${userId}/${name}`
}

function emit(entry: Entry, state: CollectionState<unknown>) {
  entry.state = state
  entry.listeners.forEach((listener) => listener())
}

function getEntry(userId: string, name: CollectionName): Entry {
  const key = keyOf(userId, name)
  let entry = entries.get(key)
  if (!entry) {
    entry = { state: initialState, listeners: new Set(), unsubscribe: null, releaseTimer: null }
    entries.set(key, entry)
  }
  return entry
}

function start(entry: Entry, userId: string, name: CollectionName) {
  if (entry.unsubscribe) return
  entry.unsubscribe = onSnapshot(
    userCollection(userId, name),
    { includeMetadataChanges: true },
    (snapshot) => {
      const fromCache = snapshot.metadata.fromCache
      // Vuoto e solo dalla cache (es. primo avvio offline): non sappiamo ancora se non ci sono dati,
      // quindi resta "in caricamento" invece di mostrare uno stato vuoto falso.
      if (fromCache && snapshot.empty && entry.state.status !== 'ready') return
      // Con includeMetadataChanges arrivano anche eventi senza modifiche ai documenti:
      // in quel caso aggiorno solo il flag, mantenendo lo stesso array (niente render inutili).
      const data =
        snapshot.docChanges().length || entry.state.status !== 'ready' ? toRecords(snapshot) : entry.state.data
      emit(entry, { status: 'ready', data, error: null, fromCache })
    },
    (error) => emit(entry, { ...entry.state, status: 'error', error }),
  )
}

function stop(entry: Entry, key: string) {
  entry.unsubscribe?.()
  entry.unsubscribe = null
  entry.state = initialState
  entries.delete(key)
}

/** Iscrizione condivisa e con conteggio dei riferimenti: un solo onSnapshot per collezione e utente. */
export function subscribeCollection(userId: string, name: CollectionName, listener: () => void): () => void {
  const key = keyOf(userId, name)
  const entry = getEntry(userId, name)
  if (entry.releaseTimer) {
    clearTimeout(entry.releaseTimer)
    entry.releaseTimer = null
  }
  entry.listeners.add(listener)
  start(entry, userId, name)
  return () => {
    entry.listeners.delete(listener)
    if (entry.listeners.size === 0 && !entry.releaseTimer) {
      entry.releaseTimer = setTimeout(() => {
        entry.releaseTimer = null
        if (entry.listeners.size === 0) stop(entry, key)
      }, RELEASE_DELAY_MS)
    }
  }
}

export function getCollectionState<T>(userId: string, name: CollectionName): CollectionState<T> {
  return (entries.get(keyOf(userId, name))?.state ?? initialState) as CollectionState<T>
}

/** Riapre il listener di una collezione dopo un errore (pulsante "Riprova"). */
export function retryCollection(userId: string, name: CollectionName) {
  const entry = entries.get(keyOf(userId, name))
  if (!entry) return
  entry.unsubscribe?.()
  entry.unsubscribe = null
  emit(entry, { ...entry.state, status: 'loading', error: null })
  start(entry, userId, name)
}

/** Ferma tutti i listener (al logout). */
export function resetCollections() {
  for (const [key, entry] of entries) {
    if (entry.releaseTimer) clearTimeout(entry.releaseTimer)
    stop(entry, key)
  }
}
