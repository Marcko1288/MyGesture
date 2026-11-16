const admin = require('firebase-admin')
const { onSchedule } = require('firebase-functions/v2/scheduler')

admin.initializeApp()
const db = admin.firestore()

function toDate(value) {
  if (!value) return null
  if (typeof value.toDate === 'function') return value.toDate()
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function dayStart(value = new Date()) {
  const date = new Date(value)
  date.setHours(0, 0, 0, 0)
  return date
}

exports.sendSubscriptionExpiryNotifications = onSchedule({ schedule: '0 9 * * *', timeZone: 'Europe/Rome' }, async () => {
  const users = await db.collection('NewMyDB').listDocuments()
  const today = dayStart()
  const daysBefore = [15, 7, 1]

  await Promise.all(users.map(async (userRef) => {
    const [subscriptionsSnapshot, tokensSnapshot] = await Promise.all([
      userRef.collection('Subscription').get(),
      userRef.collection('PushToken').get(),
    ])
    const subscriptions = subscriptionsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
    const tokens = tokensSnapshot.docs.map((doc) => doc.data().token).filter(Boolean)
    if (!tokens.length) return

    const messages = []
    for (const subscription of subscriptions) {
      const expiry = dayStart(toDate(subscription.data_fine))
      if (!expiry) continue
      const familyId = subscription.uid_father || subscription.uid || subscription.id
      const renewed = subscriptions.some((candidate) => {
        const candidateFamily = candidate.uid_father || candidate.uid || candidate.id
        const candidateStart = toDate(candidate.data_inizio)
        return candidate.id !== subscription.id && candidateFamily === familyId && candidateStart && candidateStart > expiry
      })
      if (renewed) continue
      const remainingDays = Math.round((expiry - today) / 86400000)
      if (!daysBefore.includes(remainingDays)) continue
      messages.push({ notification: { title: 'Abbonamento in scadenza', body: `${subscription.name || 'Un abbonamento'} scade tra ${remainingDays} ${remainingDays === 1 ? 'giorno' : 'giorni'}.` }, webpush: { fcmOptions: { link: '/' } }, tokens })
    }
    await Promise.all(messages.map(async (message) => {
      const result = await admin.messaging().sendEachForMulticast(message)
      const invalidTokens = result.responses.flatMap((response, index) => response.success ? [] : [tokens[index]])
      await Promise.all(invalidTokens.map((token) => userRef.collection('PushToken').doc(token).delete()))
    }))
  }))
})
