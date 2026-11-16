import { deleteDoc, setDoc, updateDoc, writeBatch, type DocumentReference } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { factories } from '../domain/records'
import type { Entity, EntityMap } from '../domain/types'
import { entityCollections, requireUserId, userDoc } from './paths'

/** Crea un record applicando i default dell'entità (stessi campi dell'app storica) e ownerId. */
export async function createRecord<K extends Entity>(
  entity: K,
  values: Partial<EntityMap[K]>,
  userId: string,
): Promise<EntityMap[K]> {
  const ownerId = requireUserId(userId)
  const record = { ...factories[entity](values), ownerId } as EntityMap[K]
  await setDoc(userDoc(ownerId, entityCollections[entity], record.uid), record)
  return record
}

/** Aggiorna solo i campi forniti e rinnova data_modify. Fallisce se il documento non esiste. */
export async function updateRecord<K extends Entity>(
  entity: K,
  uid: string,
  values: Partial<EntityMap[K]>,
  userId: string,
) {
  const ownerId = requireUserId(userId)
  if (!uid) throw new Error('uid obbligatorio per modificare un record.')
  const { uid: _uid, ownerId: _owner, data_ins: _createdAt, id: _id, ...changes } = values as Record<string, unknown>
  const update = { ...changes, data_modify: new Date().toISOString() }
  await updateDoc(userDoc(ownerId, entityCollections[entity], uid), update)
  return { id: uid, ...update }
}

export async function deleteRecord(entity: Entity, uid: string, userId: string) {
  const ownerId = requireUserId(userId)
  if (!uid) throw new Error('uid obbligatorio per eliminare un record.')
  await deleteDoc(userDoc(ownerId, entityCollections[entity], uid))
}

export type BatchOperation =
  | { type: 'set'; ref: DocumentReference; data: Record<string, unknown> }
  | { type: 'update'; ref: DocumentReference; data: Record<string, unknown> }
  | { type: 'delete'; ref: DocumentReference }

export const MAX_BATCH_SIZE = 500

/** Esegue le operazioni in batch da massimo 500, segnalando l'avanzamento. */
export async function commitInBatches(
  operations: BatchOperation[],
  onProgress?: (done: number, total: number) => void,
) {
  for (let index = 0; index < operations.length; index += MAX_BATCH_SIZE) {
    const batch = writeBatch(db)
    for (const operation of operations.slice(index, index + MAX_BATCH_SIZE)) {
      if (operation.type === 'set') batch.set(operation.ref, operation.data)
      else if (operation.type === 'update') batch.update(operation.ref, operation.data)
      else batch.delete(operation.ref)
    }
    await batch.commit()
    onProgress?.(Math.min(index + MAX_BATCH_SIZE, operations.length), operations.length)
  }
}

/** Operazione di creazione per un batch (stessi default e ownerId di createRecord). */
export function createOperation<K extends Entity>(entity: K, values: Partial<EntityMap[K]>, userId: string) {
  const ownerId = requireUserId(userId)
  const record = { ...factories[entity](values), ownerId } as EntityMap[K]
  const operation: BatchOperation = {
    type: 'set',
    ref: userDoc(ownerId, entityCollections[entity], record.uid),
    data: record as unknown as Record<string, unknown>,
  }
  return { record, operation }
}
