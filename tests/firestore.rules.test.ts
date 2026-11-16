/**
 * Test delle security rules sull'emulatore Firestore (API REST, token non firmati accettati dall'emulatore).
 * Esecuzione: npm run test:rules
 */
import { beforeAll, describe, expect, it } from 'vitest'

const host = process.env.FIRESTORE_EMULATOR_HOST ?? '127.0.0.1:8080'
const projectId = process.env.GCLOUD_PROJECT ?? 'demo-mygesture'
const base = `http://${host}/v1/projects/${projectId}/databases/(default)/documents`

function token(uid: string) {
  const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url')
  const now = Math.floor(Date.now() / 1000)
  const payload = {
    sub: uid,
    user_id: uid,
    iat: now,
    exp: now + 3600,
    aud: projectId,
    iss: `https://securetoken.google.com/${projectId}`,
    firebase: { sign_in_provider: 'password' },
  }
  return `${encode({ alg: 'none', typ: 'JWT' })}.${encode(payload)}.`
}

type Value = string | number | boolean | null
const toFields = (data: Record<string, Value>) =>
  Object.fromEntries(
    Object.entries(data).map(([key, value]) => [
      key,
      value === null
        ? { nullValue: null }
        : typeof value === 'number'
          ? { doubleValue: value }
          : typeof value === 'boolean'
            ? { booleanValue: value }
            : { stringValue: value },
    ]),
  )

async function request(method: string, path: string, uid: string | null, data?: Record<string, Value>) {
  const response = await fetch(`${base}/${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(uid ? { Authorization: `Bearer ${token(uid)}` } : {}) },
    body: data ? JSON.stringify({ fields: toFields(data) }) : undefined,
  })
  return response.status
}

const write = (path: string, uid: string | null, data: Record<string, Value>) => request('PATCH', path, uid, data)
const read = (path: string, uid: string | null) => request('GET', path, uid)

beforeAll(async () => {
  await fetch(`http://${host}/emulator/v1/projects/${projectId}/databases/(default)/documents`, { method: 'DELETE' })
})

describe('firestore.rules', () => {
  it("l'utente legge e scrive i propri dati", async () => {
    expect(
      await write('NewMyDB/alice/Cash/CASH_1', 'alice', { uid: 'CASH_1', conto: 100, data_valore: '2026-11-16' }),
    ).toBe(200)
    expect(await read('NewMyDB/alice/Cash/CASH_1', 'alice')).toBe(200)
  })

  it('un utente non può leggere né scrivere i dati di un altro', async () => {
    expect(await read('NewMyDB/alice/Cash/CASH_1', 'bob')).toBe(403)
    expect(await write('NewMyDB/alice/Cash/CASH_2', 'bob', { conto: 1 })).toBe(403)
    expect(await request('DELETE', 'NewMyDB/alice/Cash/CASH_1', 'bob')).toBe(403)
  })

  it('senza autenticazione non si accede a nulla', async () => {
    expect(await read('NewMyDB/alice/Cash/CASH_1', null)).toBe(403)
    expect(await write('NewMyDB/alice/Buy/BUY_1', null, { amount: 1 })).toBe(403)
  })

  it('fuori da NewMyDB è tutto negato', async () => {
    expect(await write('Altro/doc', 'alice', { x: 1 })).toBe(403)
    expect(await read('NewMyDB/alice', 'alice')).toBe(403)
  })

  it('le altre collezioni del proprietario (altre app) restano accessibili solo a lui', async () => {
    expect(await write('NewMyDB/alice/Contract/C1', 'alice', { name: 'x' })).toBe(200)
    expect(await read('NewMyDB/alice/Contract/C1', 'alice')).toBe(200)
    expect(await write('NewMyDB/alice/HolidayEvent/E1/Days/D1', 'alice', { n: 1 })).toBe(200)
    expect(await read('NewMyDB/alice/Contract/C1', 'bob')).toBe(403)
    expect(await read('NewMyDB/alice/HolidayEvent/E1/Days/D1', 'bob')).toBe(403)
    expect(await write('NewMyDB/alice/Contract/C2', 'bob', { name: 'x' })).toBe(403)
  })

  it('valida i tipi dei campi principali', async () => {
    expect(
      await write('NewMyDB/alice/Buy/BUY_1', 'alice', { uid: 'BUY_1', amount: 12.5, name: 'Spesa', group: 'GRP_1' }),
    ).toBe(200)
    expect(await write('NewMyDB/alice/Buy/BUY_2', 'alice', { amount: 'dodici' })).toBe(403)
    expect(await write('NewMyDB/alice/Bank/BANK_1', 'alice', { amount: '-3' })).toBe(403)
    expect(await write('NewMyDB/alice/Group/GRP_1', 'alice', { all: 'si' })).toBe(403)
    expect(await write('NewMyDB/alice/Cash/CASH_3', 'alice', { conto: 1, ownerId: 'bob' })).toBe(403)
  })

  it('PushToken: il documento deve avere id uguale al token', async () => {
    expect(
      await write('NewMyDB/alice/PushToken/abc', 'alice', { token: 'abc', updatedAt: '2026-11-16T10:00:00Z' }),
    ).toBe(200)
    expect(
      await write('NewMyDB/alice/PushToken/abc2', 'alice', { token: 'altro', updatedAt: '2026-11-16T10:00:00Z' }),
    ).toBe(403)
  })
})
