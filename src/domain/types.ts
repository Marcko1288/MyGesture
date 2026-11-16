/**
 * Modello dati Firestore: NewMyDB/{authUid}/{Collection}/{docId}.
 * I nomi dei campi sono quelli storici e NON vanno rinominati. Le date sono salvate come
 * stringhe ISO, ma i dati più vecchi possono contenere Timestamp Firestore.
 */

/** Valore di data così come può arrivare da Firestore. */
export type DateValue =
  | string
  | number
  | Date
  | { toDate: () => Date }
  | { seconds: number; nanoseconds?: number }
  | { _seconds: number; _nanoseconds?: number }
  | null
  | undefined

/** Campi comuni a tutti i documenti creati dall'app. */
export interface BaseRecord {
  /** Id del documento Firestore (aggiunto in lettura, non salvato). */
  id?: string
  uid: string
  data_ins: DateValue
  data_modify: DateValue
  /** Uid Firebase del proprietario, aggiunto da createRecord. */
  ownerId?: string
}

export interface Cash extends BaseRecord {
  conto: number
  anticipo: number
  otherp: number
  otherm: number
  /** `YYYY-MM-DD` (form attuale), ISO completo o Timestamp (dati storici). */
  data_valore: DateValue
}

export type RecurrenceRound = 'MEN' | 'SET' | ''
export type MonthlyRoundType = 'DAT' | 'INI' | 'FIN'
export type WeekdayRoundType = 'LUN' | 'MAR' | 'MER' | 'GIO' | 'VEN' | 'SAB' | 'DOM'

export interface Buy extends BaseRecord {
  data_valore: DateValue
  amount: number
  name: string
  /** Uid del Group. */
  group: string
  icon: number
  repeat: boolean
  uid_father: string
  round: RecurrenceRound | string
  type_round: MonthlyRoundType | WeekdayRoundType | '' | string
  data_fine: DateValue
}

export interface Group extends BaseRecord {
  name: string
  icon: number
  /** true = incluso nei totali. Un gruppo senza il campo è escluso da totali e da "Gruppi esclusi". */
  all?: boolean
}

export interface Bank extends BaseRecord {
  data_valore: DateValue
  operation: string
  detail: string
  card: string
  accounting: string
  /** Categoria fornita dalla banca. */
  category: string
  /** Categoria calcolata dalle regole a keyword (default "Spese"). */
  new_category: string
  currency: string
  /** Positivo = entrata, negativo = uscita. */
  amount: number
}

export interface Subscription extends BaseRecord {
  name: string
  data_inizio: DateValue
  data_fine: DateValue
  amount: number
  /** '' per il primo abbonamento, uid del capostipite per i rinnovi. */
  uid_father: string
}

export interface Partner extends BaseRecord {
  email: string
  nome: string
  cognome: string
  username: string
  imageUrl: string
}

/** Documento PushToken: l'id del documento è il token stesso. */
export interface PushToken {
  id?: string
  token: string
  updatedAt: string
  /** Aggiunti dalla Fase 0 (opzionali sui documenti più vecchi). */
  deviceId?: string
  userAgent?: string
}

export type CollectionName = 'Bank' | 'Buy' | 'Cash' | 'Group' | 'Partner' | 'Subscription' | 'PushToken'

export interface EntityMap {
  bank: Bank
  buy: Buy
  cash: Cash
  group: Group
  partner: Partner
  subscription: Subscription
}
export type Entity = keyof EntityMap
