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
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    const client = windows.find((item) => new URL(item.url).origin === self.location.origin)
    if (client) {
      await client.focus()
      if ('navigate' in client && client.url !== url) await client.navigate(url).catch(() => {})
      return
    }
    await self.clients.openWindow(url)
  })())
})

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))

importScripts('https://www.gstatic.com/firebasejs/9.22.2/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/9.22.2/firebase-messaging-compat.js')

firebase.initializeApp({
  apiKey: 'AIzaSyB5op4aWJ4jdCaKmy2BsLJGsz5F5ZlFlV8',
  authDomain: 'mygestion-446b9.firebaseapp.com',
  projectId: 'mygestion-446b9',
  storageBucket: 'mygestion-446b9.firebasestorage.app',
  messagingSenderId: '187789660649',
  appId: '1:187789660649:web:6b17922eeb4cc3a2fa7b78',
})

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
