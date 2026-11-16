import { v4 as uuidv4 } from "uuid";

export function createPartner({
  uid,
  email,
  nome,
  cognome,
  username,
  imageUrl,
  data_ins,
  data_modify,
}) {
  const now = new Date().toISOString();
  
  return {
    uid: uid ?? `PAT_${uuidv4().toUpperCase().substring(0, 8)}`,
    email: email ?? "",
    nome: nome ?? "",
    cognome: cognome ?? "",
    username: email ?? "",
    imageUrl: imageUrl ?? "",
    data_ins: data_ins ?? now,
    data_modify: data_modify ?? now,
  };
}