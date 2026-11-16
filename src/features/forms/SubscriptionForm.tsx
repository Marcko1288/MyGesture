import { useState, type FormEvent } from 'react'
import { useUserId } from '../../data/auth'
import { useSubscriptions } from '../../data/hooks'
import { createRecord, updateRecord } from '../../data/mutations'
import { useOptimisticSave } from '../../data/optimistic'
import { useUndoableDelete } from '../../data/pendingDeletes'
import { formatAmountInput, parseAmountInput, startOfDayIso, toDateInput } from '../../domain/inputs'
import { idOf } from '../../domain/numbers'
import { renewalOf } from '../../domain/subscriptions'
import type { Subscription } from '../../domain/types'
import { AmountInput, Button, DateInput, Field, TextInput } from '../../ui'
import { FormState, type FormProps } from './FormState'

type Mode = 'new' | 'edit' | 'renew'

function SubscriptionFormBody({
  subscription,
  mode,
  formId,
  onDone,
  onRenew,
}: {
  subscription?: Subscription
  mode: Mode
  formId: string
  onDone: () => void
  onRenew: () => void
}) {
  const userId = useUserId()
  const save = useOptimisticSave()
  const remove = useUndoableDelete()
  const source = mode === 'renew' && subscription ? renewalOf(subscription) : subscription
  const today = toDateInput(new Date())
  const [name, setName] = useState(source?.name ?? '')
  const [amount, setAmount] = useState(formatAmountInput(source?.amount ?? null))
  const [start, setStart] = useState(toDateInput(source?.data_inizio) || today)
  const [end, setEnd] = useState(toDateInput(source?.data_fine) || today)
  const [errors, setErrors] = useState<Partial<Record<'name' | 'amount' | 'end', string>>>({})

  function submit(event: FormEvent) {
    event.preventDefault()
    const value = parseAmountInput(amount)
    const next: typeof errors = {}
    if (!name.trim()) next.name = "Scrivi il nome dell'abbonamento."
    if (value === null || value < 0) next.amount = 'Inserisci un importo, ad esempio 9,99.'
    if (end < start) next.end = 'La scadenza deve essere uguale o successiva alla data di inizio.'
    setErrors(next)
    if (Object.keys(next).length) return
    const values: Partial<Subscription> = {
      name: name.trim(),
      amount: value!,
      data_inizio: startOfDayIso(start)!,
      data_fine: startOfDayIso(end)!,
    }
    if (mode === 'edit' && subscription)
      save(() => updateRecord('subscription', idOf(subscription), values, userId), 'Abbonamento aggiornato')
    else if (mode === 'renew' && source)
      save(
        () => createRecord('subscription', { ...values, uid_father: source.uid_father }, userId),
        'Abbonamento rinnovato',
      )
    else save(() => createRecord('subscription', values, userId), 'Abbonamento aggiunto')
    onDone()
  }

  return (
    <form id={formId} onSubmit={submit} noValidate className="flex flex-col gap-4 pt-1">
      {mode === 'renew' && (
        <p className="px-1 text-[15px] text-muted">
          Il rinnovo parte dal giorno dopo la scadenza e dura un anno. Puoi modificare importo e date.
        </p>
      )}
      <Field label="Nome" error={errors.name}>
        {({ id, describedBy }) => (
          <TextInput
            id={id}
            aria-describedby={describedBy}
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Es. Netflix"
            autoFocus={mode === 'new'}
          />
        )}
      </Field>
      <Field label="Importo" error={errors.amount}>
        {({ id, describedBy }) => (
          <AmountInput
            id={id}
            aria-describedby={describedBy}
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
          />
        )}
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Inizio">
          {({ id }) => <DateInput id={id} value={start} onChange={(event) => setStart(event.target.value)} />}
        </Field>
        <Field label="Scadenza" error={errors.end}>
          {({ id, describedBy }) => (
            <DateInput
              id={id}
              aria-describedby={describedBy}
              value={end}
              onChange={(event) => setEnd(event.target.value)}
            />
          )}
        </Field>
      </div>
      {mode === 'edit' && subscription && (
        <>
          <Button variant="secondary" onClick={onRenew}>
            Rinnova
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              remove('subscription', [subscription], `${subscription.name || 'Abbonamento'} eliminato`)
              onDone()
            }}
          >
            Elimina abbonamento
          </Button>
        </>
      )}
    </form>
  )
}

/** Foglio "Nuovo abbonamento" / "Modifica" / "Rinnova" (rinnovo = nuovo record con lo stesso uid_father). */
export default function SubscriptionForm({
  id,
  mode,
  formId,
  onDone,
  onRenew,
}: FormProps & { mode: Mode; onRenew: () => void }) {
  const subscriptions = useSubscriptions()
  const subscription = id ? subscriptions.data.find((item) => idOf(item) === id || item.id === id) : undefined
  return (
    <FormState id={id} status={subscriptions.status} found={Boolean(subscription)} onDone={onDone}>
      <SubscriptionFormBody
        key={`${mode}-${id ?? 'new'}`}
        subscription={subscription}
        mode={mode}
        formId={formId}
        onDone={onDone}
        onRenew={onRenew}
      />
    </FormState>
  )
}
