// Gestore registrato PRIMA di firebase.messaging(): così viene eseguito per primo
// e gestisce il tocco su tutte le notifiche (anche quelle mostrate dall'SDK FCM),
// aprendo l'app o portandola in primo piano.
self.addEventListener('notificationclick', (event) => {
  event.stopImmediatePropagation()
  event.notification.close()
  const data = event.notification.data || {}
  const payload = data.FCM_MSG || data
  const link = payload?.fcmOptions?.link || payload?.data?.link || payload?.link || '/'
  const url = new URL(link, self.location.origin).href
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      const client = windows.find((item) => new URL(item.url).origin === self.location.origin)
      if (client) {
        await client.focus()
        if ('navigate' in client && client.url !== url) await client.navigate(url).catch(() => {})
        return
      }
      await self.clients.openWindow(url)
    })(),
  )
})

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))

// Generato al build da vite-plugins/firebaseMessagingSw.ts: SDK compat servito dallo stesso
// dominio (versione allineata al pacchetto npm) e config letta dalle variabili VITE_FIREBASE_*.
importScripts('/firebase/firebase-app-compat.js?v=__FIREBASE_VERSION__')
importScripts('/firebase/firebase-messaging-compat.js?v=__FIREBASE_VERSION__')

firebase.initializeApp(__FIREBASE_CONFIG__)

const messaging = firebase.messaging()

// I messaggi con "notification" vengono mostrati dall'SDK. Per eventuali messaggi solo-dati
// mostriamo comunque una notifica: su iOS una push senza notifica visibile può far revocare
// l'iscrizione.
messaging.onBackgroundMessage((payload) => {
  const title = payload.data?.title || 'My Gesture'
  return self.registration.showNotification(title, {
    body: payload.data?.body || '',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    data: { link: payload.data?.link || '/' },
  })
})
