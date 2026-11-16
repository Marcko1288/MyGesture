import { v4 as uuidv4 } from 'uuid'

export function createGroup({ uid, name, icon, all, data_ins, data_modify } = {}) {
  const now = new Date().toISOString()
  return {
    uid: uid ?? `GRP_${uuidv4().toUpperCase().substring(0, 8)}`,
    name: name ?? '',
    icon: icon ?? 0,
    all: all ?? true,
    data_ins: data_ins ?? now,
    data_modify: data_modify ?? now,
  }
}
