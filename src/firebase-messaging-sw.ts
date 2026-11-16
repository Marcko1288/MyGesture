/// <reference lib="webworker" />
/**
 * Service worker unico dell'app (vite-plugin-pwa, strategia injectManifest):
 * - precache della shell e degli asset con hash → l'app si apre anche offline;
 * - notifiche push di Firebase Cloud Messaging (SDK modulare);
 * - aggiornamento su richiesta: la nuova versione si attiva quando l'utente tocca "Aggiorna".
 * Il nome del file resta firebase-messaging-sw.js, così la registrazione delle notifiche non cambia.
 */
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching'
import { NavigationRoute, registerRoute } from 'workbox-routing'
import { initializeApp } from 'firebase/app'
import { getMessaging, onBackgroundMessage } from 'firebase/messaging/sw'

declare let self: ServiceWorkerGlobalScope

// Registrato per primo: gestisce il tocco su tutte le notifiche (anche quelle mostrate dall'SDK FCM).
self.addEventListener('notificationclick', (event) => {
  event.stopImmediatePropagation()
  event.notification.close()
  const data = (event.notification.data ?? {}) as Record<string, unknown>
  const payload = (data.FCM_MSG ?? data) as { fcmOptions?: { link?: string }; data?: { link?: string }; link?: string }
  const url = new URL(payload?.fcmOptions?.link || payload?.data?.link || payload?.link || '/', self.location.origin)
    .href
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      const client = windows.find((item) => new URL(item.url).origin === self.location.origin)
      if (client) {
        await client.focus()
        if ('navigate' in client && client.url !== url) await client.navigate(url).catch(() => undefined)
        return
      }
      await self.clients.openWindow(url)
    })(),
  )
})

self.addEventListener('message', (event) => {
  if ((event.data as { type?: string } | null)?.type === 'SKIP_WAITING') self.skipWaiting()
})
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))

precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()
// Tutte le navigazioni (URL dell'app) servono index.html dalla cache, tranne gli endpoint riservati di Firebase.
registerRoute(new NavigationRoute(createHandlerBoundToURL('index.html'), { denylist: [/^\/__\//] }))

const app = initializeApp({
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
})

// I messaggi con "notification" sono mostrati dall'SDK. Per quelli solo-dati mostriamo comunque una notifica:
// su iOS una push senza notifica visibile può far revocare l'iscrizione.
onBackgroundMessage(getMessaging(app), (payload) => {
  if (payload.notification) return
  const title = payload.data?.title || 'My Gesture'
  void self.registration.showNotification(title, {
    body: payload.data?.body || '',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    data: { link: payload.data?.link || '/' },
  })
})
