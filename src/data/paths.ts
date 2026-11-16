import { collection, doc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import type { CollectionName, Entity } from '../domain/types'

export const ROOT_COLLECTION = 'NewMyDB'

export const entityCollections: Record<Entity, CollectionName> = {
  bank: 'Bank',
  buy: 'Buy',
  cash: 'Cash',
  group: 'Group',
  partner: 'Partner',
  subscription: 'Subscription',
}

export function requireUserId(userId: string | null | undefined): string {
  if (!userId) throw new Error('Per accedere ai dati devi essere autenticato.')
  return userId
}

export function userCollection(userId: string, name: CollectionName | 'Settings') {
  return collection(db, ROOT_COLLECTION, requireUserId(userId), name)
}

export function userDoc(userId: string, name: CollectionName | 'Settings', id: string) {
  return doc(db, ROOT_COLLECTION, requireUserId(userId), name, id)
}
