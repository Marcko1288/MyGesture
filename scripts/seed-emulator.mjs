/**
 * Popola gli emulatori (auth + firestore) con un utente e dati di esempio.
 * Uso: con gli emulatori avviati (npm run emulators) → node scripts/seed-emulator.mjs
 * Utente: demo@mygesture.test / password123
 */
import { buildSample, DEMO_EMAIL, DEMO_PASSWORD } from './seed-data.mjs'

const projectId = process.env.GCLOUD_PROJECT ?? 'demo-mygesture'
const authHost = process.env.FIREBASE_AUTH_EMULATOR_HOST ?? '127.0.0.1:9099'
const firestoreHost = process.env.FIRESTORE_EMULATOR_HOST ?? '127.0.0.1:8080'
const email = DEMO_EMAIL
const password = DEMO_PASSWORD

async function call(url, options) {
  const response = await fetch(url, options)
  const body = await response.json().catch(() => ({}))
  if (!response.ok && !(body.error?.message === 'EMAIL_EXISTS')) {
    throw new Error(`${options?.method ?? 'GET'} ${url} → ${response.status} ${JSON.stringify(body)}`)
  }
  return body
}

async function ensureUser() {
  const base = `http://${authHost}/identitytoolkit.googleapis.com/v1`
  const payload = {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, returnSecureToken: true }),
  }
  const created = await call(`${base}/accounts:signUp?key=fake-api-key`, payload)
  if (created.localId) return created.localId
  const signedIn = await call(`${base}/accounts:signInWithPassword?key=fake-api-key`, payload)
  return signedIn.localId
}

function toValue(value) {
  if (value === null || value === undefined) return { nullValue: null }
  if (typeof value === 'boolean') return { booleanValue: value }
  if (typeof value === 'number')
    return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value }
  return { stringValue: String(value) }
}

async function put(userId, collection, record) {
  const url = `http://${firestoreHost}/v1/projects/${projectId}/databases/(default)/documents/NewMyDB/${userId}/${collection}/${record.uid}`
  const fields = Object.fromEntries(
    Object.entries({ ...record, ownerId: userId }).map(([key, value]) => [key, toValue(value)]),
  )
  await call(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer owner' },
    body: JSON.stringify({ fields }),
  })
}

const sample = buildSample()

const userId = await ensureUser()
for (const [collection, records] of Object.entries(sample)) {
  for (const record of records) await put(userId, collection, record)
}
console.log(`Dati di esempio caricati per ${email} (uid ${userId}).`)
