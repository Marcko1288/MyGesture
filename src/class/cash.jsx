import { v4 as uuidv4 } from "uuid";

export function createCash({
  uid,
  data_valore,
  conto,
  anticipo,
  otherp,
  otherm,
  data_ins,
  data_modify,
} = {}) {

  const now = new Date().toISOString();

  return {
    uid: uid ?? `CASH_${uuidv4().toUpperCase().substring(0, 8)}`,

    conto: conto ?? 0,
    anticipo: anticipo ?? 0,
    otherp: otherp ?? 0,
    otherm: otherm ?? 0,
    data_valore: data_valore ?? now,

    data_ins: data_ins ?? now,
    data_modify: data_modify ?? now,
  };
}
