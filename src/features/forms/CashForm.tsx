import { useMemo, useState, type FormEvent } from 'react'
import { useUserId } from '../../data/auth'
import { useBuys, useCash, useGroups } from '../../data/hooks'
import { createRecord, updateRecord } from '../../data/mutations'
import { useOptimisticSave } from '../../data/optimistic'
import { useUndoableDelete } from '../../data/pendingDeletes'
import { yearlyExpenses } from '../../domain/buys'
import { cashTotal } from '../../domain/cash'
import { formatDate } from '../../domain/format'
import { formatAmountInput, parseAmountInput, toDateInput } from '../../domain/inputs'
import { idOf } from '../../domain/numbers'
import type { Cash } from '../../domain/types'
import { Amount, AmountInput, Button, DateInput, Field, TextInput } from '../../ui'
import { FormState, type FormProps } from './FormState'

type AmountField = 'conto' | 'anticipo' | 'otherp' | 'otherm'
const secondary: { key: Exclude<AmountField, 'conto'>; label: string; hint: string }[] = [
  { key: 'anticipo', label: 'Spese anticipate', hint: 'Spese dei gruppi già pagate, da recuperare' },
  { key: 'otherp', label: 'Altri accrediti', hint: 'Somme che devono ancora entrare' },
  { key: 'otherm', label: 'Altri addebiti', hint: 'Somme che devono ancora uscire' },
]

function CashFormBody({ cash, formId, onDone }: { cash?: Cash; formId: string; onDone: () => void }) {
  const userId = useUserId()
  const buys = useBuys()
  const groups = useGroups()
  const save = useOptimisticSave()
  const remove = useUndoableDelete()
  const [day, setDay] = useState(() => toDateInput(cash?.data_valore ?? cash?.data_ins) || toDateInput(new Date()))
  const [values, setValues] = useState<Record<AmountField, string>>(() => ({
    conto: formatAmountInput(cash?.conto ?? null),
    anticipo: formatAmountInput(cash?.anticipo ?? null),
    otherp: formatAmountInput(cash?.otherp ?? null),
    otherm: formatAmountInput(cash?.otherm ?? null),
  }))
  const [error, setError] = useState('')
  const parsed = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(values).map(([key, value]) => [key, value.trim() ? parseAmountInput(value) : 0]),
      ) as Record<AmountField, number | null>,
    [values],
  )
  const invalid = (Object.keys(parsed) as AmountField[]).filter((key) => parsed[key] === null)
  const total = invalid.length ? null : cashTotal(parsed as Record<AmountField, number>)
  const expenses = useMemo(() => yearlyExpenses(buys.data, groups.data), [buys.data, groups.data])

  function submit(event: FormEvent) {
    event.preventDefault()
    if (!values.conto.trim() || invalid.length) {
      setError(
        !values.conto.trim() ? 'Inserisci il saldo del conto.' : 'Controlla gli importi: usa numeri come 1234,56.',
      )
      return
    }
    // Formato storico del form Cash: data come YYYY-MM-DD.
    const record = { data_valore: day, ...(parsed as Record<AmountField, number>) }
    if (cash) save(() => updateRecord('cash', idOf(cash), record, userId), 'Saldo aggiornato')
    else save(() => createRecord('cash', record, userId), 'Saldo registrato')
    onDone()
  }

  return (
    <form id={formId} onSubmit={submit} noValidate className="flex flex-col gap-4 pt-1">
      <Field label="Saldo del conto" error={error}>
        {({ id, describedBy }) => (
          <AmountInput
            id={id}
            aria-describedby={describedBy}
            value={values.conto}
            onChange={(event) => setValues((current) => ({ ...current, conto: event.target.value }))}
            autoFocus={!cash}
          />
        )}
      </Field>
      <Field label="Data">
        {({ id }) => <DateInput id={id} value={day} onChange={(event) => setDay(event.target.value)} />}
      </Field>
      {secondary.map((item) => (
        <Field
          key={item.key}
          label={item.label}
          hint={item.hint}
          error={invalid.includes(item.key) ? 'Importo non valido' : undefined}
        >
          {({ id, describedBy }) => (
            <div className="flex gap-2">
              <TextInput
                id={id}
                aria-describedby={describedBy}
                inputMode="decimal"
                placeholder="0,00"
                className="tabular"
                value={values[item.key]}
                onChange={(event) => setValues((current) => ({ ...current, [item.key]: event.target.value }))}
              />
              {item.key === 'anticipo' && (
                <Button
                  variant="secondary"
                  className="shrink-0"
                  onClick={() => setValues((current) => ({ ...current, anticipo: formatAmountInput(expenses) }))}
                >
                  Spese dell'anno
                </Button>
              )}
            </div>
          )}
        </Field>
      ))}
      <div className="flex items-center justify-between rounded-2xl bg-surface-2 px-4 py-3">
        <span className="text-[15px] text-muted">Totale</span>
        <Amount value={total} size="lg" />
      </div>
      {cash && (
        <Button
          variant="destructive"
          onClick={() => {
            remove('cash', [cash], `Saldo del ${formatDate(cash.data_valore)} eliminato`)
            onDone()
          }}
        >
          Elimina saldo
        </Button>
      )}
    </form>
  )
}

/** Foglio "Nuovo saldo" / "Modifica saldo": conto + anticipo + altri accrediti − altri addebiti. */
export default function CashForm({ id, formId, onDone }: FormProps) {
  const cash = useCash()
  const record = id ? cash.data.find((item) => idOf(item) === id || item.id === id) : undefined
  return (
    <FormState id={id} status={cash.status} found={Boolean(record)} onDone={onDone}>
      <CashFormBody key={id ?? 'new'} cash={record} formId={formId} onDone={onDone} />
    </FormState>
  )
}
