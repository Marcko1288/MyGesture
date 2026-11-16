import { db } from '../firebase/firebase.jsx'
import { createBank } from '../class/bank.jsx'
import { createBuy } from '../class/buy.jsx'
import { createCash } from '../class/cash.jsx'
import { createGroup } from '../class/group.jsx'
import { createPartner } from '../class/partner.jsx'
import { createSubscription } from '../class/subscription.jsx'
import { toFirestoreDate } from '../utils/firestoreDate.js'

const entities = {
  bank: { collection: 'Bank', create: createBank },
  buy: { collection: 'Buy', create: createBuy },
  cash: { collection: 'Cash', create: createCash },
  group: { collection: 'Group', create: createGroup },
  partner: { collection: 'Partner', create: createPartner },
  subscription: { collection: 'Subscription', create: createSubscription },
}

function configFor(entity) {
  const config = entities[String(entity).toLowerCase()]
  if (!config) throw new Error(`Entita Firestore non supportata: ${entity}`)
  if (!db) throw new Error('Firestore non e disponibile. Verifica la configurazione Firebase.')
  return config
}

function requireUserId(userId) {
  if (!userId) throw new Error('Per accedere ai dati devi essere autenticato.')
  return userId
}

function toRecords(snapshot) {
  return snapshot.docs.map((document) => ({ id: document.id, ...document.data() }))
}

function timestampValue(value) {
  if (typeof value?.toMillis === 'function') return value.toMillis()
  return toFirestoreDate(value)?.getTime() ?? 0
}

function sortByMostRecent(records) {
  return records.sort((a, b) => timestampValue(b.data_valore ?? b.data_ins ?? b.data_modify) - timestampValue(a.data_valore ?? a.data_ins ?? a.data_modify))
}

function userCollection(collection, userId) {
  return db.collection('NewMyDB').doc(userId).collection(collection)
}

/** Recupera tutti i documenti dell'utente per una singola entita. */
export async function getRecords(entity, userId) {
  const { collection } = configFor(entity)
  const ownerId = requireUserId(userId)
  const snapshot = await userCollection(collection, ownerId).get()
  return sortByMostRecent(toRecords(snapshot))
}

/** Ascolta le modifiche in tempo reale. Restituisce unsubscribe(). */
export function subscribeRecords(entity, userId, onChange, onError) {
  const { collection } = configFor(entity)
  const ownerId = requireUserId(userId)
  return userCollection(collection, ownerId).onSnapshot(
    (snapshot) => onChange(sortByMostRecent(toRecords(snapshot))),
    onError,
  )
}

/** Crea un record applicando i valori di default del relativo file in class/. */
export async function createRecord(entity, values = {}, userId) {
  const { collection, create } = configFor(entity)
  const ownerId = requireUserId(userId)
  const record = { ...create(values), ownerId }
  await userCollection(collection, ownerId).doc(record.uid).set(record)
  return record
}

/** Aggiorna solamente i campi forniti e rinnova data_modify. */
export async function updateRecord(entity, uid, values, userId) {
  const { collection } = configFor(entity)
  const ownerId = requireUserId(userId)
  if (!uid) throw new Error('uid obbligatorio per modificare un record.')
  const { uid: ignoredUid, ownerId: ignoredOwner, data_ins: ignoredCreatedAt, ...changes } = values
  const reference = userCollection(collection, ownerId).doc(uid)
  const snapshot = await reference.get()
  if (!snapshot.exists) throw new Error('Record non trovato o non autorizzato.')
  const update = { ...changes, data_modify: new Date().toISOString() }
  await reference.update(update)
  return { id: uid, ...snapshot.data(), ...update }
}

/** Elimina un record soltanto se appartiene all'utente corrente. */
export async function deleteRecord(entity, uid, userId) {
  const { collection } = configFor(entity)
  const ownerId = requireUserId(userId)
  if (!uid) throw new Error('uid obbligatorio per eliminare un record.')
  const reference = userCollection(collection, ownerId).doc(uid)
  const snapshot = await reference.get()
  if (!snapshot.exists) throw new Error('Record non trovato o non autorizzato.')
  await reference.delete()
}

export const buyStore = { get: (userId) => getRecords('buy', userId), subscribe: (userId, onChange, onError) => subscribeRecords('buy', userId, onChange, onError), create: (values, userId) => createRecord('buy', values, userId), update: (uid, values, userId) => updateRecord('buy', uid, values, userId), remove: (uid, userId) => deleteRecord('buy', uid, userId) }
export const bankStore = { get: (userId) => getRecords('bank', userId), subscribe: (userId, onChange, onError) => subscribeRecords('bank', userId, onChange, onError), create: (values, userId) => createRecord('bank', values, userId), update: (uid, values, userId) => updateRecord('bank', uid, values, userId), remove: (uid, userId) => deleteRecord('bank', uid, userId) }
export const cashStore = { get: (userId) => getRecords('cash', userId), subscribe: (userId, onChange, onError) => subscribeRecords('Cash', userId, onChange, onError), create: (values, userId) => createRecord('cash', values, userId), update: (uid, values, userId) => updateRecord('cash', uid, values, userId), remove: (uid, userId) => deleteRecord('cash', uid, userId) }
export const groupStore = { get: (userId) => getRecords('group', userId), subscribe: (userId, onChange, onError) => subscribeRecords('group', userId, onChange, onError), create: (values, userId) => createRecord('group', values, userId), update: (uid, values, userId) => updateRecord('group', uid, values, userId), remove: (uid, userId) => deleteRecord('group', uid, userId) }
export const partnerStore = { get: (userId) => getRecords('partner', userId), subscribe: (userId, onChange, onError) => subscribeRecords('partner', userId, onChange, onError), create: (values, userId) => createRecord('partner', values, userId), update: (uid, values, userId) => updateRecord('partner', uid, values, userId), remove: (uid, userId) => deleteRecord('partner', uid, userId) }
export const subscriptionStore = { get: (userId) => getRecords('subscription', userId), subscribe: (userId, onChange, onError) => subscribeRecords('subscription', userId, onChange, onError), create: (values, userId) => createRecord('subscription', values, userId), update: (uid, values, userId) => updateRecord('subscription', uid, values, userId), remove: (uid, userId) => deleteRecord('subscription', uid, userId) }
