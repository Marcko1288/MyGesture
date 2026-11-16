import { localDayKey, toDate } from './dates'
import { determineNewCategory, type CategoryRule, defaultCategoryRules } from './categories'
import { toNumber } from './numbers'
import type { Bank } from './types'

/** Intestazioni attese, nell'ordine delle colonne lette. */
export const STATEMENT_HEADERS = [
  'Data',
  'Operazione',
  'Dettagli',
  'Conto o carta',
  'Contabilizzazione',
  'Categoria',
  'Valuta',
  'Importo',
] as const

export type Cell = string | number | boolean | Date | null | undefined
export type Row = Cell[]

/** Indice della riga di intestazione (contiene Data, Operazione e Importo), -1 se assente. */
export function findHeaderRow(rows: Row[]): number {
  return rows.findIndex((row) => {
    const cells = row.map((value) =>
      String(value ?? '')
        .trim()
        .toLowerCase(),
    )
    return cells.includes('data') && cells.includes('operazione') && cells.includes('importo')
  })
}

/**
 * Data seriale Excel (sistema 1900) → giorno di calendario.
 * Il seriale 60 è il 29/02/1900 inesistente di Excel; sotto quel valore il conteggio è spostato di un giorno.
 */
export function excelSerialToDay(serial: number): { y: number; m: number; d: number } | null {
  if (!Number.isFinite(serial) || serial < 0) return null
  const whole = Math.floor(serial)
  // Come SheetJS: 0 = "0 gennaio 1900" (cioè 31/12/1899), 60 = 29/02/1900.
  if (whole === 0) return { y: 1900, m: 1, d: 0 }
  if (whole === 60) return { y: 1900, m: 2, d: 29 }
  const date = new Date(Date.UTC(1899, 11, whole < 60 ? 31 : 30) + whole * 86_400_000)
  return { y: date.getUTCFullYear(), m: date.getUTCMonth() + 1, d: date.getUTCDate() }
}

/**
 * Data del movimento in ISO, come nell'import storico:
 * Date → toISOString(); seriale Excel o stringa `M/D/YY(YY)` → mezzogiorno locale.
 * Le date impossibili (mese 13, 30 febbraio…) sono considerate non valide.
 */
export function parseBankDate(value: Cell): string | null {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.toISOString()
  if (typeof value === 'number') {
    const day = excelSerialToDay(value)
    return day ? new Date(day.y, day.m - 1, day.d, 12).toISOString() : null
  }
  const match = String(value ?? '')
    .trim()
    .match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/)
  if (!match) return null
  const [, month, day, yearValue] = match as unknown as [string, string, string, string]
  const year = yearValue.length === 2 ? 2000 + Number(yearValue) : Number(yearValue)
  const date = new Date(year, Number(month) - 1, Number(day), 12)
  // Rifiuta le date impossibili (es. 13/1/26, 2/30/26): l'import storico le faceva "traboccare"
  // nel mese successivo salvando una data sbagliata senza segnalarlo.
  if (date.getFullYear() !== year || date.getMonth() !== Number(month) - 1 || date.getDate() !== Number(day))
    return null
  return date.toISOString()
}

/** Importo con `,` come separatore delle migliaia (`-1,234.56`). null se non numerico. */
export function parseAmount(value: Cell): number | null {
  const amount = Number(
    String(value ?? '')
      .replaceAll(',', '')
      .trim(),
  )
  return Number.isFinite(amount) ? amount : null
}

export interface ParsedRow {
  /** Posizione nel file (0 = prima riga dopo l'intestazione, righe vuote escluse). */
  index: number
  values: Row
  record: Partial<Bank> & { data_valore: string; amount: number; new_category: string }
}

export interface RowError {
  index: number
  values: Row
  error: string
}

const text = (value: Cell) =>
  value === null || value === undefined ? '' : value instanceof Date ? value.toISOString() : String(value)

/** Converte le righe dopo l'intestazione in movimenti (righe vuote ignorate, errori raccolti). */
export function parseStatementRows(rows: Row[], rules: CategoryRule[] = defaultCategoryRules) {
  const parsed: ParsedRow[] = []
  const errors: RowError[] = []
  rows
    .filter((row) => row.some((value) => value !== '' && value != null))
    .forEach((values, index) => {
      const data_valore = parseBankDate(values[0])
      const amount = parseAmount(values[7])
      if (!data_valore || amount === null) {
        errors.push({ index, values, error: !data_valore ? 'Data non valida' : 'Importo non valido' })
        return
      }
      const operation = text(values[1])
      const detail = text(values[2])
      parsed.push({
        index,
        values,
        record: {
          data_valore,
          operation,
          detail,
          card: text(values[3]),
          accounting: text(values[4]),
          category: text(values[5]),
          currency: text(values[6]),
          amount,
          new_category: determineNewCategory(operation, detail, rules),
        },
      })
    })
  return { parsed, errors }
}

/** Legge un foglio già convertito in righe: trova l'intestazione e interpreta le righe successive. */
export function parseStatementSheet(rows: Row[], rules?: CategoryRule[]) {
  const headerIndex = findHeaderRow(rows)
  if (headerIndex < 0) return null
  return parseStatementRows(rows.slice(headerIndex + 1), rules)
}

const normalize = (value: unknown) =>
  String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLocaleLowerCase('it-IT')

type DedupeFields = Pick<Bank, 'data_valore' | 'amount'> & { operation?: string; detail?: string }

/** Chiave di deduplica: giorno locale + importo + operazione + dettagli (testo normalizzato). */
export function dedupeKey(record: DedupeFields): string {
  const date = toDate(record.data_valore)
  return [
    date ? localDayKey(date) : '',
    toNumber(record.amount).toFixed(2),
    normalize(record.operation),
    normalize(record.detail),
  ].join('|')
}

/**
 * Separa le righe da importare dai duplicati già presenti su Firestore, tenendo conto della molteplicità:
 * righe identiche nello stesso file sono transazioni distinte; se su Firestore ne esistono già N uguali,
 * le prime N del file sono duplicati e le altre vengono importate (decisione del 16/11/2026, opzione a).
 */
export function planImport(parsed: ParsedRow[], existing: DedupeFields[]) {
  const available = new Map<string, number>()
  for (const record of existing) {
    const key = dedupeKey(record)
    available.set(key, (available.get(key) ?? 0) + 1)
  }
  const toImport: ParsedRow[] = []
  const duplicates: ParsedRow[] = []
  for (const row of parsed) {
    const key = dedupeKey(row.record)
    const count = available.get(key) ?? 0
    if (count > 0) {
      available.set(key, count - 1)
      duplicates.push(row)
    } else toImport.push(row)
  }
  return { toImport, duplicates }
}

/** Totale entrate (≥ 0) e uscite (< 0) delle righe. */
export function importTotals(rows: ParsedRow[]) {
  return rows.reduce(
    (totals, row) => {
      if (row.record.amount >= 0) totals.income += row.record.amount
      else totals.expenses += row.record.amount
      return totals
    },
    { income: 0, expenses: 0 },
  )
}

/** CSV degli errori (separatore `;`, BOM per Excel), con le colonne originali + motivo. */
export function errorsCsv(errors: RowError[]): string {
  const escape = (value: Cell) => `"${text(value).replaceAll('"', '""')}"`
  const header = [...STATEMENT_HEADERS, 'Errore'].join(';')
  const lines = errors.map((row) => [...row.values, row.error].map(escape).join(';'))
  return `﻿${header}\n${lines.join('\n')}`
}
