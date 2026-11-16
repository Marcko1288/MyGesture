import { useCallback, useSyncExternalStore } from 'react'
import type { Entity } from '../domain/types'
import { idOf } from '../domain/numbers'
import { useToast } from '../ui/Toast'
import { useUserId } from './auth'
import { commitInBatches } from './mutations'
import { entityCollections, userDoc } from './paths'

/**
 * Eliminazioni in attesa: i record spariscono subito dalle liste e vengono cancellati davvero
 * solo quando il toast si chiude senza "Annulla". Se l'app viene chiusa prima, non si perde nulla.
 */
let hidden = new Set<string>()
const listeners = new Set<() => void>()
const keyOf = (entity: Entity, id: string) => `${entity}:${id}`

function setHidden(next: Set<string>) {
  hidden = next
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** Filtra i record in attesa di eliminazione. */
export function useWithoutPendingDeletes<T extends { uid?: string; id?: string }>(entity: Entity, records: T[]): T[] {
  const current = useSyncExternalStore(subscribe, () => hidden)
  if (!current.size) return records
  return records.filter(
    (record) => !current.has(keyOf(entity, idOf(record))) && !current.has(keyOf(entity, record.id ?? '')),
  )
}

/** Restituisce `remove(entity, records, message)`: nasconde, mostra il toast con Annulla, poi elimina in batch. */
export function useUndoableDelete() {
  const userId = useUserId()
  const toast = useToast()
  return useCallback(
    (entity: Entity, records: { uid?: string; id?: string }[], message: string, onDeleted?: () => void) => {
      const ids = records.map(idOf).filter(Boolean)
      const keys = ids.map((id) => keyOf(entity, id))
      setHidden(new Set([...hidden, ...keys]))
      const restore = () => setHidden(new Set([...hidden].filter((key) => !keys.includes(key))))
      toast({
        message,
        action: { label: 'Annulla', onAction: restore },
        onDismiss: () => {
          commitInBatches(ids.map((id) => ({ type: 'delete', ref: userDoc(userId, entityCollections[entity], id) })))
            .then(() => onDeleted?.())
            .catch((error: unknown) => {
              console.error(error)
              toast({ message: 'Eliminazione non riuscita: riprova.', tone: 'error' })
            })
            .finally(restore)
        },
      })
    },
    [toast, userId],
  )
}
