/** Valore numerico di un campo (stringhe e valori non validi → 0), come nell'app storica. */
export function toNumber(value: unknown): number {
  return Number(value) || 0
}

/** Id di un record: uid se presente, altrimenti id del documento. */
export function idOf(record: { uid?: string; id?: string }): string {
  return record.uid ?? record.id ?? ''
}
