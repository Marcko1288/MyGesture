import { v4 as uuidv4 } from 'uuid'

export function createSubscription({ uid, name, data_inizio, data_fine, amount, uid_father, data_ins, data_modify } = {}) {
  const now = new Date().toISOString()
  return {
    uid: uid ?? `SUB_${uuidv4().toUpperCase().substring(0, 8)}`,
    name: name ?? '',
    data_inizio: data_inizio ?? now,
    data_fine: data_fine ?? now,
    amount: amount ?? 0,
    uid_father: uid_father ?? '',
    data_ins: data_ins ?? now,
    data_modify: data_modify ?? now,
  }
}
