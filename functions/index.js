const { initializeApp } = require('firebase-admin/app')
const { getFirestore } = require('firebase-admin/firestore')
const { getMessaging } = require('firebase-admin/messaging')
const { logger } = require('firebase-functions')
const { onSchedule } = require('firebase-functions/v2/scheduler')
const { onCall, HttpsError } = require('firebase-functions/v2/https')

initializeApp()
const db = getFirestore()

const { TIME_ZONE, dueReminders, reminderText } = require('./expiry')

const ICON = '/icons/icon-192.png'
// Solo questi errori indicano un token non più valido: tutti gli altri
// (quota, rete, errori interni FCM) sono temporanei e il token va tenuto.
const INVALID_TOKEN_ERRORS = new Set([
  'messaging/registration-token-not-registered',
  'messaging/invalid-registration-token',
])

function buildMessage(title, body, link = '/') {
  return {
    notification: { title, body },
    data: { link },
    webpush: {
      headers: { Urgency: 'high' },
      notification: { title, body, icon: ICON, badge: ICON },
    },
  }
}

/** Invia a tutti i token dell'utente ed elimina solo quelli davvero non validi. */
async function sendToUser(userRef, tokens, message) {
  const result = await getMessaging().sendEachForMulticast({ ...message, tokens })
  const invalid = []
  const errors = []
  result.responses.forEach((response, index) => {
    if (response.success) return
    const code = response.error?.code ?? 'unknown'
    errors.push({ token: `${tokens[index].slice(0, 12)}…`, code, message: response.error?.message })
    if (INVALID_TOKEN_ERRORS.has(code)) invalid.push(tokens[index])
  })
  if (errors.length) logger.warn('Invio push con errori', { user: userRef.id, errors })
  await Promise.all(invalid.map((token) => userRef.collection('PushToken').doc(token).delete()))
  return { sent: result.successCount, failed: result.failureCount, removed: invalid.length, errors }
}

async function readTokens(userRef) {
  const snapshot = await userRef.collection('PushToken').get()
  return [...new Set(snapshot.docs.map((doc) => doc.data().token || doc.id).filter(Boolean))]
}

exports.sendSubscriptionExpiryNotifications = onSchedule({ schedule: '0 9 * * *', timeZone: TIME_ZONE }, async () => {
  const users = await db.collection('NewMyDB').listDocuments()
  const summary = {
    users: users.length,
    usersWithTokens: 0,
    tokens: 0,
    notifications: 0,
    sent: 0,
    failed: 0,
    removed: 0,
  }

  await Promise.all(
    users.map(async (userRef) => {
      const [subscriptionsSnapshot, tokens] = await Promise.all([
        userRef.collection('Subscription').get(),
        readTokens(userRef),
      ])
      if (!tokens.length) return
      summary.usersWithTokens += 1
      summary.tokens += tokens.length

      const subscriptions = subscriptionsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
      const messages = dueReminders(subscriptions).map(({ subscription, remainingDays }) =>
        buildMessage('Abbonamento in scadenza', reminderText(subscription, remainingDays), '/'),
      )

      for (const message of messages) {
        try {
          const result = await sendToUser(userRef, tokens, message)
          summary.notifications += 1
          summary.sent += result.sent
          summary.failed += result.failed
          summary.removed += result.removed
        } catch (error) {
          logger.error('Invio push non riuscito', { user: userRef.id, error: error.message, code: error.code })
        }
      }
    }),
  )

  logger.info('Notifiche scadenze abbonamenti completate', summary)
})

/** Invia una notifica di prova a tutti i dispositivi dell'utente autenticato. */
exports.sendTestNotification = onCall(async (request) => {
  const uid = request.auth?.uid
  if (!uid) throw new HttpsError('unauthenticated', 'Devi essere autenticato.')
  const userRef = db.collection('NewMyDB').doc(uid)
  const tokens = await readTokens(userRef)
  if (!tokens.length) {
    throw new HttpsError(
      'failed-precondition',
      'Nessun dispositivo registrato per le notifiche. Attiva le notifiche dalle Impostazioni.',
    )
  }
  const time = new Intl.DateTimeFormat('it-IT', { timeZone: TIME_ZONE, hour: '2-digit', minute: '2-digit' }).format(
    new Date(),
  )
  const result = await sendToUser(
    userRef,
    tokens,
    buildMessage('Notifica di prova', `Le notifiche funzionano (inviata alle ${time}).`, '/'),
  )
  logger.info('Notifica di prova', { user: uid, tokens: tokens.length, ...result })
  return {
    tokens: tokens.length,
    sent: result.sent,
    failed: result.failed,
    removed: result.removed,
    errors: result.errors.map((error) => error.code),
  }
})
