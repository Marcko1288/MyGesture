import { toDate } from './dates'
import type { Bank, Cash } from './types'

const escape = (value: unknown) => `"${String(value ?? '').replaceAll('"', '""')}"`

/** CSV dei movimenti (stesso formato dell'esportazione storica dell'estratto conto). */
export function statementCsv(records: Bank[]): string {
  const headers = [
    'UID',
    'Data',
    'Operazione',
    'Dettagli',
    'Conto o carta',
    'Contabilizzazione',
    'Categoria',
    'Valuta',
    'Importo',
  ]
  const rows = records.map((record) =>
    [
      record.uid ?? record.id ?? '',
      toDate(record.data_valore)?.toLocaleDateString('it-IT') || '',
      record.operation,
      record.detail,
      record.card,
      record.accounting,
      record.category,
      record.currency,
      record.amount,
    ]
      .map(escape)
      .join(';'),
  )
  return `﻿${headers.map(escape).join(';')}\n${rows.join('\n')}`
}

function cellValue(value: unknown): string {
  if (value == null) return ''
  const date = typeof value === 'object' ? toDate(value) : null
  if (date) return date.toISOString()
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

/** CSV completo dello storico saldo: tutte le colonne presenti, in ordine alfabetico (formato storico). */
export function cashCsv(records: Cash[]): string {
  const columns = [...new Set(records.flatMap((record) => Object.keys(record)))].sort()
  const rows = records.map((record) =>
    columns.map((column) => escape(cellValue((record as unknown as Record<string, unknown>)[column]))).join(';'),
  )
  return `﻿${columns.map(escape).join(';')}\n${rows.join('\n')}`
}
