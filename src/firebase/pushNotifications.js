import { db, functions, getMessagingInstance } from './firebase.jsx'

const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY
const DEVICE_KEY = 'mygesture-device-id'
const SW_URL = '/firebase-messaging-sw.js'
const SYNC_INTERVAL_MS = 60 * 60 * 1000

let lastSync = 0
let syncing = null

/** Id casuale e stabile per questo dispositivo/browser: serve a eliminare i token vecchi dello stesso iPhone. */
function deviceId() {
  try {
    let id = localStorage.getItem(DEVICE_KEY)
    if (!id) {
      id = crypto.randomUUID()
      localStorage.setItem(DEVICE_KEY, id)
    }
    return id
  } catch {
    return 'unknown'
  }
}

function tokenCollection(userId) {
  return db.collection('NewMyDB').doc(userId).collection('PushToken')
}

function isIos() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}

function isStandalone() {
  return window.navigator.standalone === true || window.matchMedia?.('(display-mode: standalone)').matches
}

/** Verifica se le push sono utilizzabili qui e, se non lo sono, spiega il motivo. */
export async function pushSupport() {
  if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) {
    return {
      supported: false,
      reason: isIos() && !isStandalone()
        ? 'Su iPhone le notifiche funzionano solo aprendo l’app dall’icona nella schermata Home.'
        : 'Le notifiche push non sono supportate da questo browser.',
    }
  }
  if (!vapidKey) return { supported: false, reason: 'Manca VITE_FIREBASE_VAPID_KEY nella build: le notifiche non possono essere attivate.' }
  const messaging = await getMessagingInstance()
  if (!messaging) return { supported: false, reason: 'Firebase Messaging non è supportato da questo browser.' }
  return { supported: true, messaging }
}

async function registerToken(userId, messaging) {
  const registration = await navigator.serviceWorker.register(SW_URL)
  await navigator.serviceWorker.ready
  const token = await messaging.getToken({ vapidKey, serviceWorkerRegistration: registration })
  if (!token) throw new Error('Non è stato possibile ottenere il token per le notifiche.')

  const id = deviceId()
  const collection = tokenCollection(userId)
  const updatedAt = new Date().toISOString()
  await collection.doc(token).set({ token, updatedAt, deviceId: id, userAgent: navigator.userAgent }, { merge: true })

  // Rimuove i token precedenti dello stesso dispositivo (ruotati da iOS/FCM).
  const sameDevice = await collection.where('deviceId', '==', id).get()
  await Promise.all(sameDevice.docs.filter((doc) => doc.id !== token).map((doc) => doc.ref.delete()))
  return { token, updatedAt }
}

/** Chiede il permesso (va chiamata da un tocco dell'utente) e registra il token. */
export async function enablePushNotifications(userId) {
  if (!userId) throw new Error('Per attivare le notifiche devi essere autenticato.')
  const support = await pushSupport()
  if (!support.supported) throw new Error(support.reason)
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') throw new Error('Permesso notifiche non concesso. Puoi abilitarlo da Impostazioni › Notifiche › My Gesture.')
  lastSync = Date.now()
  return registerToken(userId, support.messaging)
}

/**
 * Da chiamare a ogni avvio e al ritorno in primo piano: se il permesso è già concesso,
 * rinnova il token e lo salva in PushToken. Così, se iOS/FCM ruota il token o la function
 * lo elimina, viene registrato di nuovo senza dover premere nulla.
 */
export async function syncPushToken(userId, { force = false } = {}) {
  if (!userId || !('Notification' in window) || Notification.permission !== 'granted') return null
  if (!force && Date.now() - lastSync < SYNC_INTERVAL_MS) return null
  if (syncing) return syncing
  syncing = (async () => {
    try {
      const support = await pushSupport()
      if (!support.supported) return null
      const result = await registerToken(userId, support.messaging)
      lastSync = Date.now()
      return result
    } catch (error) {
      console.warn('Sincronizzazione del token push non riuscita', error)
      return null
    } finally {
      syncing = null
    }
  })()
  return syncing
}

/** Stato reale delle notifiche per le Impostazioni. */
export async function getPushStatus(userId) {
  const support = await pushSupport()
  const permission = 'Notification' in window ? Notification.permission : 'unsupported'
  let deviceToken = null
  let totalTokens = 0
  if (userId) {
    const snapshot = await tokenCollection(userId).get()
    totalTokens = snapshot.size
    const doc = snapshot.docs.find((item) => item.data().deviceId === deviceId())
    if (doc) deviceToken = { updatedAt: doc.data().updatedAt ?? null }
  }
  return { supported: support.supported, reason: support.reason ?? null, permission, deviceToken, totalTokens }
}

/** Chiede alla Cloud Function di inviare una push di prova a tutti i dispositivi dell'utente. */
export async function sendTestNotification() {
  if (!functions) throw new Error('Firebase Functions non è disponibile.')
  const result = await functions.httpsCallable('sendTestNotification')()
  return result.data
}
