/**
 * Popola gli emulatori (auth + firestore) con un utente e dati di esempio.
 * Uso: con gli emulatori avviati (npm run emulators) → node scripts/seed-emulator.mjs
 * Utente: demo@mygesture.test / password123
 */
const projectId = process.env.GCLOUD_PROJECT ?? 'demo-mygesture'
const authHost = process.env.FIREBASE_AUTH_EMULATOR_HOST ?? '127.0.0.1:9099'
const firestoreHost = process.env.FIRESTORE_EMULATOR_HOST ?? '127.0.0.1:8080'
const email = 'demo@mygesture.test'
const password = 'password123'

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

const today = new Date()
const at = (year, month, day, hour = 12) => new Date(year, month, day, hour).toISOString()
const y = today.getFullYear()
const m = today.getMonth()
const stamp = { data_ins: today.toISOString(), data_modify: today.toISOString() }

export const sample = {
  Cash: [
    {
      uid: 'CASH_SEED0001',
      conto: 12000,
      anticipo: 1500,
      otherp: 300,
      otherm: 200,
      data_valore: at(y, m - 1, 28).slice(0, 10),
      ...stamp,
    },
    {
      uid: 'CASH_SEED0002',
      conto: 12800,
      anticipo: 1600,
      otherp: 250,
      otherm: 150,
      data_valore: today.toISOString().slice(0, 10),
      ...stamp,
    },
  ],
  Group: [
    { uid: 'GRP_SEEDCASA', name: 'Casa', icon: 1, all: true, ...stamp },
    { uid: 'GRP_SEEDAUTO', name: 'Auto', icon: 3, all: true, ...stamp },
    { uid: 'GRP_SEEDEXTR', name: 'Extra (escluso)', icon: 9, all: false, ...stamp },
  ],
  Buy: [
    {
      uid: 'BUY_SEED0001',
      name: 'Bolletta luce',
      amount: 85.4,
      group: 'GRP_SEEDCASA',
      icon: 1,
      repeat: false,
      uid_father: '',
      round: '',
      type_round: '',
      data_valore: at(y, 0, 15),
      data_fine: at(y, 0, 15),
      ...stamp,
    },
    {
      uid: 'BUY_SEED0002',
      name: 'Tagliando',
      amount: 320,
      group: 'GRP_SEEDAUTO',
      icon: 3,
      repeat: false,
      uid_father: '',
      round: '',
      type_round: '',
      data_valore: at(y, Math.max(m - 1, 0), 3),
      data_fine: at(y, Math.max(m - 1, 0), 3),
      ...stamp,
    },
    {
      uid: 'BUY_SEED0003',
      name: 'Regalo',
      amount: 60,
      group: 'GRP_SEEDEXTR',
      icon: 6,
      repeat: false,
      uid_father: '',
      round: '',
      type_round: '',
      data_valore: at(y, Math.max(m - 1, 0), 10),
      data_fine: at(y, Math.max(m - 1, 0), 10),
      ...stamp,
    },
    {
      uid: 'BUY_SEEDREC1',
      name: 'Affitto box',
      amount: 100,
      group: 'GRP_SEEDCASA',
      icon: 1,
      repeat: true,
      uid_father: 'BUY_SEEDREC1',
      round: 'MEN',
      type_round: 'INI',
      data_valore: at(y, m, 1),
      data_fine: at(y, m + 2, 1),
      ...stamp,
    },
    {
      uid: 'BUY_SEEDREC2',
      name: 'Affitto box',
      amount: 100,
      group: 'GRP_SEEDCASA',
      icon: 1,
      repeat: true,
      uid_father: 'BUY_SEEDREC1',
      round: 'MEN',
      type_round: 'INI',
      data_valore: at(y, m + 1, 1),
      data_fine: at(y, m + 2, 1),
      ...stamp,
    },
    {
      uid: 'BUY_SEEDOLD1',
      name: 'Anno scorso',
      amount: 999,
      group: 'GRP_SEEDCASA',
      icon: 1,
      repeat: false,
      uid_father: '',
      round: '',
      type_round: '',
      data_valore: at(y - 1, 5, 1),
      data_fine: at(y - 1, 5, 1),
      ...stamp,
    },
  ],
  Bank: [
    {
      uid: 'BANK_SEED001',
      data_valore: at(y, m - 1, 2),
      operation: 'Stipendio',
      detail: 'ACME SPA',
      card: 'Conto',
      accounting: 'Contabilizzato',
      category: 'Entrate',
      new_category: 'Stipendio',
      currency: 'EUR',
      amount: 2500,
      ...stamp,
    },
    {
      uid: 'BANK_SEED002',
      data_valore: at(y, m - 1, 5),
      operation: 'Bonifico',
      detail: 'Aldo Cassi canone',
      card: 'Conto',
      accounting: 'Contabilizzato',
      category: 'Casa',
      new_category: 'Affitto',
      currency: 'EUR',
      amount: -800,
      ...stamp,
    },
    {
      uid: 'BANK_SEED003',
      data_valore: at(y, m - 1, 6),
      operation: 'Accantonamento',
      detail: 'Salvadanaio',
      card: 'Conto',
      accounting: 'Contabilizzato',
      category: 'Investimenti, BDR e Salvadanaio',
      new_category: 'Salvadanaio',
      currency: 'EUR',
      amount: -300,
      ...stamp,
    },
    {
      uid: 'BANK_SEED004',
      data_valore: at(y, m - 1, 9),
      operation: 'Pagamento POS',
      detail: 'Supermercato',
      card: 'Carta',
      accounting: 'Contabilizzato',
      category: 'Spesa',
      new_category: 'Spese',
      currency: 'EUR',
      amount: -94.3,
      ...stamp,
    },
    {
      uid: 'BANK_SEED005',
      data_valore: at(y, m - 1, 9),
      operation: 'Pagamento POS',
      detail: 'Bar',
      card: 'Carta',
      accounting: 'Contabilizzato',
      category: 'Bar',
      new_category: 'Spese',
      currency: 'EUR',
      amount: -2.5,
      ...stamp,
    },
    {
      uid: 'BANK_SEED006',
      data_valore: at(y, m, 1),
      operation: 'Pagamento POS',
      detail: 'Farmacia',
      card: 'Carta',
      accounting: 'Contabilizzato',
      category: 'Salute',
      new_category: 'Spese',
      currency: 'EUR',
      amount: -18,
      ...stamp,
    },
  ],
  Subscription: [
    {
      uid: 'SUB_SEED0001',
      name: 'Netflix',
      amount: 13.99,
      uid_father: '',
      data_inizio: at(y - 1, m, today.getDate() + 10, 0),
      data_fine: at(y, m, today.getDate() + 9, 0),
      ...stamp,
    },
    {
      uid: 'SUB_SEED0002',
      name: 'iCloud',
      amount: 2.99,
      uid_father: '',
      data_inizio: at(y - 1, m, today.getDate() + 5, 0),
      data_fine: at(y, m, today.getDate() + 4, 0),
      ...stamp,
    },
    {
      uid: 'SUB_SEED0003',
      name: 'iCloud',
      amount: 2.99,
      uid_father: 'SUB_SEED0002',
      data_inizio: at(y, m, today.getDate() + 5, 0),
      data_fine: at(y + 1, m, today.getDate() + 4, 0),
      ...stamp,
    },
    {
      uid: 'SUB_SEED0004',
      name: 'Palestra',
      amount: 400,
      uid_father: '',
      data_inizio: at(y - 1, 0, 1, 0),
      data_fine: at(y - 1, 11, 31, 0),
      ...stamp,
    },
  ],
}

const userId = await ensureUser()
for (const [collection, records] of Object.entries(sample)) {
  for (const record of records) await put(userId, collection, record)
}
console.log(`Dati di esempio caricati per ${email} (uid ${userId}).`)
