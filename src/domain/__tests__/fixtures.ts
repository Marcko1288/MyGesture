import type { Bank, Buy, Cash, DateValue, Group, Subscription } from '../types'

/** Generatore pseudo-casuale deterministico (mulberry32): stessi dati a ogni esecuzione. */
export function random(seed: number) {
  let state = seed >>> 0
  const next = () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  const int = (min: number, max: number) => Math.floor(next() * (max - min + 1)) + min
  const pick = <T>(items: readonly T[]): T => items[int(0, items.length - 1)]!
  return { next, int, pick }
}

type Rng = ReturnType<typeof random>

/** Le date sono salvate in formati diversi nel tempo: li alterno tutti. */
function storeDate(rng: Rng, date: Date): DateValue {
  switch (rng.int(0, 5)) {
    case 0:
      return { seconds: Math.floor(date.getTime() / 1000), nanoseconds: (date.getTime() % 1000) * 1e6 }
    case 1:
      return { toDate: () => new Date(date) }
    default:
      return date.toISOString()
  }
}

/** Data casuale tra `from` e `to` (in giorni rispetto a `today`), con ore "scomode" incluse. */
function around(rng: Rng, today: Date, fromDays: number, toDays: number) {
  const day = new Date(today.getFullYear(), today.getMonth(), today.getDate() + rng.int(fromDays, toDays))
  const hour = rng.pick([0, 0, 1, 12, 12, 23])
  day.setHours(hour, hour === 23 ? 59 : rng.int(0, 59), hour === 23 ? 59 : 0, hour === 23 ? 999 : 0)
  return day
}

const stamp = { data_ins: '2024-01-01T00:00:00.000Z', data_modify: '2024-01-01T00:00:00.000Z' }

export function makeGroups(rng: Rng): Group[] {
  const groups: Group[] = []
  const count = rng.int(2, 6)
  for (let index = 0; index < count; index += 1) {
    const all = rng.pick([true, true, true, false, undefined])
    groups.push({
      uid: `GRP_${String(index).padStart(8, '0')}`,
      name: rng.pick(['Casa', 'Auto', '', 'Extra', 'Viaggi']),
      icon: rng.int(0, 9),
      ...(all === undefined ? {} : { all }),
      ...stamp,
    })
  }
  // Gruppo con id del documento diverso dal campo uid mancante (dati storici).
  groups.push({ id: 'legacy-group-doc', name: 'Storico', icon: 0, all: true, ...stamp } as unknown as Group)
  return groups
}

export function makeBuys(rng: Rng, groups: Group[], today: Date, count = 80): Buy[] {
  const groupIds = [...groups.map((group) => group.uid ?? group.id ?? ''), 'GRP_SENZAGRP', '']
  return Array.from({ length: count }, (_, index) => {
    const date = around(rng, today, -500, 120)
    const amount = rng.pick([
      rng.int(1, 50000) / 100,
      -rng.int(1, 5000) / 100,
      0,
      '12.5' as unknown as number,
      'abc' as unknown as number,
    ])
    return {
      uid: `BUY_${String(index).padStart(8, '0')}`,
      name: `Spesa ${index}`,
      amount,
      group: rng.pick(groupIds),
      icon: rng.int(0, 9),
      repeat: false,
      uid_father: '',
      round: '',
      type_round: '',
      data_valore: rng.int(0, 30) === 0 ? 'data non valida' : storeDate(rng, date),
      data_fine: date.toISOString(),
      ...stamp,
    }
  })
}

/** Casi limite fissi: inizio anno, fine giornata, domani, 31/12 dell'anno scorso. */
export function edgeBuys(groups: Group[], today: Date): Buy[] {
  const group = groups.find((item) => item.all === true)?.uid ?? 'GRP_00000000'
  const base = {
    name: 'Limite',
    icon: 0,
    repeat: false,
    uid_father: '',
    round: '',
    type_round: '',
    group,
    data_fine: '',
    ...stamp,
  }
  const y = today.getFullYear()
  return [
    { ...base, uid: 'BUY_EDGE0001', amount: 1, data_valore: new Date(y, 0, 1, 0, 0, 0, 0).toISOString() },
    { ...base, uid: 'BUY_EDGE0002', amount: 2, data_valore: new Date(y - 1, 11, 31, 23, 59, 59, 999).toISOString() },
    {
      ...base,
      uid: 'BUY_EDGE0003',
      amount: 4,
      data_valore: new Date(y, today.getMonth(), today.getDate(), 23, 59, 59, 999).toISOString(),
    },
    {
      ...base,
      uid: 'BUY_EDGE0004',
      amount: 8,
      data_valore: new Date(y, today.getMonth(), today.getDate() + 1, 0, 0, 0, 0).toISOString(),
    },
  ]
}

export function makeCash(rng: Rng, today: Date, count = 30): Cash[] {
  return Array.from({ length: count }, (_, index) => {
    const date = around(rng, today, -900, 0)
    const value = rng.pick([
      storeDate(rng, date),
      // Formato del form attuale: YYYY-MM-DD.
      `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`,
    ])
    return {
      uid: `CASH_${String(index).padStart(8, '0')}`,
      conto: rng.int(0, 3000000) / 100,
      anticipo: rng.pick([0, rng.int(0, 500000) / 100, '100' as unknown as number]),
      otherp: rng.int(0, 50000) / 100,
      otherm: rng.pick([0, rng.int(0, 50000) / 100, null as unknown as number]),
      data_valore: value,
      data_ins: new Date(date.getTime() + rng.int(0, 1000) * 1000).toISOString(),
      data_modify: stamp.data_modify,
    }
  })
}

const operations = ['Pagamento POS', 'Bonifico', 'Accantonamento', 'Stipendio', 'Addebito SDD', 'Prelievo']
const details = [
  'Supermercato',
  'Aldo Cassi canone',
  'Salvadanaio',
  'ACME SPA',
  'Ayvens noleggio',
  'Virgin Active',
  'Bar',
  '',
]
const bankCategories = [
  'Spesa',
  'Investimenti, BDR e Salvadanaio',
  'Casa',
  'Entrate',
  ' Investimenti, BDR e Salvadanaio ',
]

export function makeBank(rng: Rng, today: Date, count = 200): Bank[] {
  return Array.from({ length: count }, (_, index) => {
    const date = around(rng, today, -240, 3)
    const operation = rng.pick(operations)
    const detail = rng.pick(details)
    return {
      uid: `BANK_${String(index).padStart(8, '0')}`,
      data_valore: storeDate(rng, date),
      operation,
      detail,
      card: 'Conto',
      accounting: 'Contabilizzato',
      category: rng.pick(bankCategories),
      new_category: rng.pick([
        'Spese',
        'Salvadanaio',
        'Affitto',
        'Stipendio',
        '',
        ' Palestra ',
        undefined as unknown as string,
      ]),
      currency: 'EUR',
      amount: rng.pick([rng.int(-200000, -1) / 100, rng.int(1, 300000) / 100, 0, '-15.5' as unknown as number]),
      ...stamp,
    }
  })
}

export function makeSubscriptions(rng: Rng, today: Date, count = 25): Subscription[] {
  const subscriptions: Subscription[] = []
  for (let index = 0; index < count; index += 1) {
    const end = around(rng, today, -60, 70)
    end.setHours(0, 0, 0, 0)
    const start = new Date(end)
    start.setFullYear(start.getFullYear() - 1)
    start.setDate(start.getDate() + 1)
    const uid = `SUB_${String(index).padStart(8, '0')}`
    subscriptions.push({
      uid,
      name: `Abbonamento ${index}`,
      amount: rng.int(100, 20000) / 100,
      uid_father: '',
      data_inizio: start.toISOString(),
      data_fine: storeDate(rng, end),
      ...stamp,
    })
    if (rng.int(0, 2) === 0) {
      // Rinnovo: stessa famiglia, inizia il giorno dopo la scadenza.
      const renewalStart = new Date(end)
      renewalStart.setDate(renewalStart.getDate() + 1)
      const renewalEnd = new Date(renewalStart)
      renewalEnd.setFullYear(renewalEnd.getFullYear() + 1)
      renewalEnd.setDate(renewalEnd.getDate() - 1)
      subscriptions.push({
        uid: `${uid}R`,
        name: `Abbonamento ${index}`,
        amount: 10,
        uid_father: uid,
        data_inizio: renewalStart.toISOString(),
        data_fine: renewalEnd.toISOString(),
        ...stamp,
      })
    }
  }
  return subscriptions
}

/** Date "oggi" su cui ripetere i confronti: giorni normali, inizio/fine anno e mese, cambi dell'ora legale. */
export const TODAYS = [
  new Date(2026, 10, 16, 10, 30),
  new Date(2026, 0, 1, 0, 5),
  new Date(2026, 11, 31, 23, 50),
  new Date(2026, 2, 29, 12, 0), // ora legale (Europe/Rome)
  new Date(2026, 9, 25, 12, 0), // ora solare
  new Date(2028, 1, 29, 9, 0), // anno bisestile
  new Date(2026, 4, 31, 18, 0),
]
