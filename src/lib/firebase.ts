import { initializeApp } from 'firebase/app'
import { browserLocalPersistence, connectAuthEmulator, indexedDBLocalPersistence, initializeAuth } from 'firebase/auth'
import {
  connectFirestoreEmulator,
  initializeFirestore,
  memoryLocalCache,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore'
import type { Functions } from 'firebase/functions'
import type { Messaging } from 'firebase/messaging'
import { firebaseConfig, useEmulators } from './env'

export const app = initializeApp(firebaseConfig)
// initializeAuth senza "popupRedirectResolver": l'accesso è solo con email e password, quindi non serve
// caricare apis.google.com (lo script per i popup). La persistenza è la stessa di getAuth: sessioni esistenti valide.
export const auth = initializeAuth(app, { persistence: [indexedDBLocalPersistence, browserLocalPersistence] })

function createFirestore() {
  try {
    // Cache persistente su IndexedDB: l'app mostra subito gli ultimi dati anche con rete lenta o assente.
    return initializeFirestore(app, {
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
      ignoreUndefinedProperties: true,
    })
  } catch (error) {
    console.warn('Cache persistente di Firestore non disponibile, uso la memoria', error)
    return initializeFirestore(app, { localCache: memoryLocalCache(), ignoreUndefinedProperties: true })
  }
}

export const db = createFirestore()

if (useEmulators) {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true })
  connectFirestoreEmulator(db, '127.0.0.1', 8080)
}

let messagingPromise: Promise<Messaging | null> | undefined

/** Firebase Messaging caricato solo quando serve; null se il browser non lo supporta. */
export function getMessagingInstance(): Promise<Messaging | null> {
  messagingPromise ??= import('firebase/messaging')
    .then(async ({ getMessaging, isSupported }) => ((await isSupported()) ? getMessaging(app) : null))
    .catch((error: unknown) => {
      console.warn('Firebase Messaging non disponibile', error)
      return null
    })
  return messagingPromise
}

let functionsPromise: Promise<Functions> | undefined

/** Cloud Functions caricate solo quando servono (es. notifica di prova). */
export function getFunctionsInstance(): Promise<Functions> {
  functionsPromise ??= import('firebase/functions').then(({ connectFunctionsEmulator, getFunctions }) => {
    const functions = getFunctions(app)
    if (useEmulators) connectFunctionsEmulator(functions, '127.0.0.1', 5001)
    return functions
  })
  return functionsPromise
}
