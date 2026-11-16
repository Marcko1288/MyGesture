import { initializeApp } from 'firebase/app'
import { connectAuthEmulator, getAuth } from 'firebase/auth'
import {
  connectFirestoreEmulator,
  initializeFirestore,
  memoryLocalCache,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore'
import { connectFunctionsEmulator, getFunctions } from 'firebase/functions'
import type { Messaging } from 'firebase/messaging'
import { firebaseConfig, useEmulators } from './env'

export const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)

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
export const functions = getFunctions(app)

if (useEmulators) {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true })
  connectFirestoreEmulator(db, '127.0.0.1', 8080)
  connectFunctionsEmulator(functions, '127.0.0.1', 5001)
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
