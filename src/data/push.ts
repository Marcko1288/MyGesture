import { deleteDoc, getDocs, query, setDoc, where } from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import type { Messaging } from 'firebase/messaging'
import { functions, getMessagingInstance } from '../lib/firebase'
import { vapidKey } from '../lib/env'
import type { PushToken } from '../domain/types'
import { requireUserId, userCollection, userDoc } from './paths'

const DEVICE_KEY = 'mygesture-device-id'
export const MESSAGING_SW_URL = '/firebase-messaging-sw.js'
const SYNC_INTERVAL_MS = 60 * 60 * 1000

let lastSync = 0
let syncing: Promise<{ token: string; updatedAt: string } | null> | null = null

/** Id casuale e stabile per questo dispositivo: serve a eliminare i token vecchi dello stesso iPhone. */
function deviceId(): string {
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

function isIos() {
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  )
}

function isStandalone() {
  return (
    (navigator as Navigator & { standalone?: boolean }).standalone === true ||
    window.matchMedia?.('(display-mode: standalone)').matches
  )
}

type Support =
  | { supported: true; messaging: Messaging; reason?: undefined }
  | { supported: false; reason: string; messaging?: undefined }

export async function pushSupport(): Promise<Support> {
  if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) {
    return {
      supported: false,
      reason:
        isIos() && !isStandalone()
          ? 'Su iPhone le notifiche funzionano solo aprendo l’app dall’icona nella schermata Home.'
          : 'Le notifiche push non sono supportate da questo browser.',
    }
  }
  if (!vapidKey)
    return {
      supported: false,
      reason: 'Manca VITE_FIREBASE_VAPID_KEY nella build: le notifiche non possono essere attivate.',
    }
  const messaging = await getMessagingInstance()
  if (!messaging) return { supported: false, reason: 'Firebase Messaging non è supportato da questo browser.' }
  return { supported: true, messaging }
}

async function registerToken(userId: string, messaging: Messaging) {
  const { getToken } = await import('firebase/messaging')
  const registration = await navigator.serviceWorker.register(MESSAGING_SW_URL)
  await navigator.serviceWorker.ready
  const token = await getToken(messaging, { vapidKey, serviceWorkerRegistration: registration })
  if (!token) throw new Error('Non è stato possibile ottenere il token per le notifiche.')

  const id = deviceId()
  const updatedAt = new Date().toISOString()
  const data: PushToken = { token, updatedAt, deviceId: id, userAgent: navigator.userAgent }
  await setDoc(userDoc(userId, 'PushToken', token), data, { merge: true })

  // Rimuove i token precedenti dello stesso dispositivo (ruotati da iOS/FCM).
  const sameDevice = await getDocs(query(userCollection(userId, 'PushToken'), where('deviceId', '==', id)))
  await Promise.all(sameDevice.docs.filter((doc) => doc.id !== token).map((doc) => deleteDoc(doc.ref)))
  return { token, updatedAt }
}

/** Chiede il permesso (va chiamata da un tocco dell'utente) e registra il token. */
export async function enablePushNotifications(userId: string) {
  requireUserId(userId)
  const support = await pushSupport()
  if (!support.supported) throw new Error(support.reason)
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') {
    throw new Error('Permesso notifiche non concesso. Puoi abilitarlo da Impostazioni › Notifiche › My Gesture.')
  }
  lastSync = Date.now()
  return registerToken(userId, support.messaging)
}

/**
 * Da chiamare all'avvio e al ritorno in primo piano: se il permesso è già concesso, rinnova il token
 * e lo salva in PushToken. Così, se iOS/FCM lo ruota o la function lo elimina, si riregistra da solo.
 */
export function syncPushToken(userId: string, { force = false } = {}) {
  if (!userId || !('Notification' in window) || Notification.permission !== 'granted') return Promise.resolve(null)
  if (!force && Date.now() - lastSync < SYNC_INTERVAL_MS) return Promise.resolve(null)
  syncing ??= (async () => {
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

export interface PushStatus {
  supported: boolean
  reason: string | null
  permission: NotificationPermission | 'unsupported'
  deviceToken: { updatedAt: string | null } | null
  totalTokens: number
}

export async function getPushStatus(userId: string): Promise<PushStatus> {
  const support = await pushSupport()
  const permission = 'Notification' in window ? Notification.permission : 'unsupported'
  const snapshot = await getDocs(userCollection(userId, 'PushToken'))
  const doc = snapshot.docs.find((item) => item.data().deviceId === deviceId())
  return {
    supported: support.supported,
    reason: support.reason ?? null,
    permission,
    deviceToken: doc ? { updatedAt: (doc.data().updatedAt as string | undefined) ?? null } : null,
    totalTokens: snapshot.size,
  }
}

export interface TestNotificationResult {
  tokens: number
  sent: number
  failed: number
  removed: number
  errors: string[]
}

export async function sendTestNotification(): Promise<TestNotificationResult> {
  const callable = httpsCallable<void, TestNotificationResult>(functions, 'sendTestNotification')
  return (await callable()).data
}
