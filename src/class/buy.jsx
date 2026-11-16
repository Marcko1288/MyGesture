import { v4 as uuidv4 } from 'uuid'

export function createBuy({ uid, data_valore, amount, name, group, icon, repeat, uid_father, round, type_round, data_fine, data_ins, data_modify } = {}) {
  const now = new Date().toISOString()
  return {
    uid: uid ?? `BUY_${uuidv4().toUpperCase().substring(0, 8)}`,
    data_valore: data_valore ?? now,
    amount: amount ?? 0,
    name: name ?? '',
    group: group ?? '',
    icon: icon ?? 0,
    repeat: repeat ?? false,
    uid_father: uid_father ?? '',
    round: round ?? '',
    type_round: type_round ?? '',
    data_fine: data_fine ?? now,
    data_ins: data_ins ?? now,
    data_modify: data_modify ?? now,
  }
}
