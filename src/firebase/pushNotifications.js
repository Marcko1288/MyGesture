import { db, messaging } from './firebase.jsx'

const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY

export async function enablePushNotifications(userId) {
  if (!userId || !messaging || !('serviceWorker' in navigator) || !('Notification' in window)) {
    throw new Error('Le notifiche push non sono supportate da questo browser.')
  }
  if (!vapidKey) throw new Error('Configura VITE_FIREBASE_VAPID_KEY per attivare le notifiche.')
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') throw new Error('Permesso notifiche non concesso.')
  await navigator.serviceWorker.register('/firebase-messaging-sw.js')
  const registration = await navigator.serviceWorker.ready
  const token = await messaging.getToken({ vapidKey, serviceWorkerRegistration: registration })
  if (!token) throw new Error('Non e stato possibile ottenere il token per le notifiche.')
  await db.collection('NewMyDB').doc(userId).collection('PushToken').doc(token).set({ token, updatedAt: new Date().toISOString() })
}
