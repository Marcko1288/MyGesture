import { v4 as uuidv4 } from 'uuid'
import type { Bank, Buy, Cash, Entity, EntityMap, Group, Partner, Subscription } from './types'
import { determineNewCategory } from './categories'

/** Formato storico degli uid: PREFISSO_ + 8 caratteri maiuscoli. */
export function newUid(prefix: string): string {
  return `${prefix}_${uuidv4().toUpperCase().substring(0, 8)}`
}

const nowIso = () => new Date().toISOString()

export function createCash(values: Partial<Cash> = {}): Cash {
  const now = nowIso()
  return {
    uid: values.uid ?? newUid('CASH'),
    conto: values.conto ?? 0,
    anticipo: values.anticipo ?? 0,
    otherp: values.otherp ?? 0,
    otherm: values.otherm ?? 0,
    data_valore: values.data_valore ?? now,
    data_ins: values.data_ins ?? now,
    data_modify: values.data_modify ?? now,
  }
}

export function createBuy(values: Partial<Buy> = {}): Buy {
  const now = nowIso()
  return {
    uid: values.uid ?? newUid('BUY'),
    data_valore: values.data_valore ?? now,
    amount: values.amount ?? 0,
    name: values.name ?? '',
    group: values.group ?? '',
    icon: values.icon ?? 0,
    repeat: values.repeat ?? false,
    uid_father: values.uid_father ?? '',
    round: values.round ?? '',
    type_round: values.type_round ?? '',
    data_fine: values.data_fine ?? now,
    data_ins: values.data_ins ?? now,
    data_modify: values.data_modify ?? now,
  }
}

export function createGroup(values: Partial<Group> = {}): Group {
  const now = nowIso()
  return {
    uid: values.uid ?? newUid('GRP'),
    name: values.name ?? '',
    icon: values.icon ?? 0,
    all: values.all ?? true,
    data_ins: values.data_ins ?? now,
    data_modify: values.data_modify ?? now,
  }
}

/** Come createBank storico: new_category è sempre ricalcolata, salvo override esplicito delle regole. */
export function createBank(values: Partial<Bank> = {}, categorize = determineNewCategory): Bank {
  const now = nowIso()
  return {
    uid: values.uid ?? newUid('BANK'),
    data_valore: values.data_valore ?? now,
    operation: values.operation ?? '',
    detail: values.detail ?? '',
    card: values.card ?? '',
    accounting: values.accounting ?? '',
    category: values.category ?? '',
    new_category: categorize(values.operation, values.detail),
    currency: values.currency ?? '',
    amount: values.amount ?? 0,
    data_ins: values.data_ins ?? now,
    data_modify: values.data_modify ?? now,
  }
}

export function createSubscription(values: Partial<Subscription> = {}): Subscription {
  const now = nowIso()
  return {
    uid: values.uid ?? newUid('SUB'),
    name: values.name ?? '',
    data_inizio: values.data_inizio ?? now,
    data_fine: values.data_fine ?? now,
    amount: values.amount ?? 0,
    uid_father: values.uid_father ?? '',
    data_ins: values.data_ins ?? now,
    data_modify: values.data_modify ?? now,
  }
}

/** Nota: `username` prende il valore di `email`, come nel codice originale. */
export function createPartner(values: Partial<Partner> = {}): Partner {
  const now = nowIso()
  return {
    uid: values.uid ?? newUid('PAT'),
    email: values.email ?? '',
    nome: values.nome ?? '',
    cognome: values.cognome ?? '',
    username: values.email ?? '',
    imageUrl: values.imageUrl ?? '',
    data_ins: values.data_ins ?? now,
    data_modify: values.data_modify ?? now,
  }
}

export const factories: { [K in Entity]: (values?: Partial<EntityMap[K]>) => EntityMap[K] } = {
  bank: createBank,
  buy: createBuy,
  cash: createCash,
  group: createGroup,
  partner: createPartner,
  subscription: createSubscription,
}
