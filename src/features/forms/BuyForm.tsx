import { useMemo, useState, type FormEvent } from 'react'
import { FiRepeat } from 'react-icons/fi'
import { useUserId } from '../../data/auth'
import { useBuys, useGroups } from '../../data/hooks'
import { commitInBatches, createOperation, createRecord, updateRecord } from '../../data/mutations'
import { useOptimisticSave } from '../../data/optimistic'
import { useUndoableDelete } from '../../data/pendingDeletes'
import { buysToDelete } from '../../domain/buys'
import { formatDate } from '../../domain/format'
import { formatAmountInput, fromDateInput, parseAmountInput, toDateInput } from '../../domain/inputs'
import { idOf } from '../../domain/numbers'
import { buildRecurringSeries, recurringDates, WEEKDAYS } from '../../domain/recurrence'
import type { Buy } from '../../domain/types'
import { AmountInput, Button, Chip, ChipRow, DateInput, Field, SegmentedControl, TextInput, Toggle } from '../../ui'
import { buyIcons, groupIcon } from '../shared/icons'
import { FormState, type FormProps } from './FormState'

const monthlyTypes = [
  { value: 'DAT', label: 'Stesso giorno' },
  { value: 'INI', label: 'Inizio mese' },
  { value: 'FIN', label: 'Fine mese' },
]
const weekdayLabels: Record<keyof typeof WEEKDAYS, string> = {
  LUN: 'Lun',
  MAR: 'Mar',
  MER: 'Mer',
  GIO: 'Gio',
  VEN: 'Ven',
  SAB: 'Sab',
  DOM: 'Dom',
}

interface Draft {
  amount: string
  name: string
  day: string
  group: string
  icon: number
  repeat: boolean
  round: 'MEN' | 'SET'
  typeRound: string
  endDay: string
}

function initialDraft(buy: Buy | undefined, group: string | undefined): Draft {
  const today = toDateInput(new Date())
  const end = new Date()
  end.setFullYear(end.getFullYear() + 1)
  return {
    amount: formatAmountInput(buy?.amount),
    name: buy?.name ?? '',
    day: toDateInput(buy?.data_valore) || today,
    group: buy?.group ?? group ?? '',
    icon: Number(buy?.icon) || 0,
    repeat: false,
    round: 'MEN',
    typeRound: 'DAT',
    endDay: toDateInput(end),
  }
}

function BuyFormBody({
  buy,
  group,
  formId,
  onDone,
  onCreateGroup,
}: {
  buy?: Buy
  group?: string
  formId: string
  onDone: () => void
  onCreateGroup: () => void
}) {
  const userId = useUserId()
  const buys = useBuys()
  const groups = useGroups()
  const save = useOptimisticSave()
  const remove = useUndoableDelete()
  const [draft, setDraft] = useState(() => initialDraft(buy, group))
  const [errors, setErrors] = useState<Partial<Record<'amount' | 'name' | 'endDay', string>>>({})
  const [confirmSeries, setConfirmSeries] = useState(false)
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((current) => ({ ...current, [key]: value }))
  const sortedGroups = useMemo(
    () => [...groups.data].sort((a, b) => (a.name || '').localeCompare(b.name || '', 'it')),
    [groups.data],
  )

  const start = fromDateInput(draft.day, buy?.data_valore)
  const end = fromDateInput(draft.endDay, undefined, 23)
  const dates = useMemo(
    () =>
      draft.repeat && start && end
        ? recurringDates({ data_valore: start, data_fine: end, round: draft.round, type_round: draft.typeRound })
        : [],
    [draft.repeat, draft.round, draft.typeRound, start, end],
  )

  function submit(event: FormEvent) {
    event.preventDefault()
    const amount = parseAmountInput(draft.amount)
    const next: typeof errors = {}
    if (amount === null) next.amount = 'Inserisci un importo, ad esempio 12,50.'
    if (!draft.name.trim()) next.name = 'Scrivi una descrizione.'
    if (draft.repeat && !dates.length)
      next.endDay = 'Con questa frequenza e questa data di fine non c’è nessuna ripetizione.'
    setErrors(next)
    if (Object.keys(next).length || !start) return

    const values: Partial<Buy> = {
      amount: amount!,
      name: draft.name.trim(),
      data_valore: start,
      group: draft.group,
      icon: draft.icon,
    }
    if (buy) {
      save(() => updateRecord('buy', idOf(buy), values, userId), 'Spesa aggiornata')
    } else if (draft.repeat) {
      const series = buildRecurringSeries(
        { ...values, repeat: true, round: draft.round, type_round: draft.typeRound, data_fine: end! },
        dates,
      )
      save(
        () => commitInBatches(series.map((item) => createOperation('buy', item, userId).operation)),
        `${series.length} spese ricorrenti create`,
      )
    } else {
      save(() => createRecord('buy', values, userId), 'Spesa aggiunta')
    }
    onDone()
  }

  const family = buy ? buysToDelete(buy, buys.data, 'family') : []
  const deleteOne = () => {
    remove('buy', [buy!], `${buy!.name || 'Spesa'} eliminata`)
    onDone()
  }

  return (
    <form id={formId} onSubmit={submit} noValidate className="flex flex-col gap-4 pt-1">
      <Field label="Importo" error={errors.amount}>
        {({ id, describedBy }) => (
          <AmountInput
            id={id}
            aria-describedby={describedBy}
            aria-invalid={Boolean(errors.amount)}
            value={draft.amount}
            onChange={(event) => set('amount', event.target.value)}
            autoFocus={!buy}
          />
        )}
      </Field>
      <Field label="Descrizione" error={errors.name}>
        {({ id, describedBy }) => (
          <TextInput
            id={id}
            aria-describedby={describedBy}
            aria-invalid={Boolean(errors.name)}
            value={draft.name}
            onChange={(event) => set('name', event.target.value)}
            placeholder="Es. Spesa al supermercato"
            autoCapitalize="sentences"
            enterKeyHint="done"
          />
        )}
      </Field>
      <Field label="Data">
        {({ id }) => (
          <DateInput id={id} value={draft.day} onChange={(event) => set('day', event.target.value)} required />
        )}
      </Field>
      <div className="flex flex-col gap-1">
        <span className="px-1 text-[13px] font-semibold text-muted">Gruppo</span>
        <ChipRow label="Gruppo">
          {sortedGroups.map((item) => {
            const Icon = groupIcon(item.icon)
            const value = idOf(item)
            return (
              <Chip key={value} icon={<Icon />} selected={draft.group === value} onClick={() => set('group', value)}>
                {item.name || 'Senza nome'}
              </Chip>
            )
          })}
          <Chip selected={draft.group === ''} onClick={() => set('group', '')}>
            Nessun gruppo
          </Chip>
          <Chip onClick={onCreateGroup}>+ Nuovo gruppo</Chip>
        </ChipRow>
      </div>
      <div className="flex flex-col gap-1">
        <span className="px-1 text-[13px] font-semibold text-muted">Icona</span>
        <ChipRow label="Icona">
          {buyIcons.map(({ id, label, icon: Icon }) => (
            <Chip
              key={id}
              icon={<Icon />}
              selected={draft.icon === id}
              onClick={() => set('icon', id)}
              aria-label={`Icona ${label}`}
              title={label}
              className="px-3"
            />
          ))}
        </ChipRow>
      </div>
      {!buy && (
        <>
          <Toggle
            label="Ripeti"
            description="Crea automaticamente le prossime spese"
            checked={draft.repeat}
            onChange={(value) => set('repeat', value)}
          />
          {draft.repeat && (
            <div className="flex flex-col gap-3 rounded-2xl border border-line p-3">
              <SegmentedControl
                label="Frequenza"
                value={draft.round}
                onChange={(value) =>
                  setDraft((current) => ({ ...current, round: value, typeRound: value === 'SET' ? 'LUN' : 'DAT' }))
                }
                options={[
                  { value: 'MEN', label: 'Ogni mese' },
                  { value: 'SET', label: 'Ogni settimana' },
                ]}
              />
              <ChipRow label={draft.round === 'SET' ? 'Giorno della settimana' : 'Giorno del mese'}>
                {(draft.round === 'SET'
                  ? (Object.keys(weekdayLabels) as (keyof typeof WEEKDAYS)[]).map((value) => ({
                      value,
                      label: weekdayLabels[value],
                    }))
                  : monthlyTypes
                ).map((option) => (
                  <Chip
                    key={option.value}
                    selected={draft.typeRound === option.value}
                    onClick={() => set('typeRound', option.value)}
                  >
                    {option.label}
                  </Chip>
                ))}
              </ChipRow>
              <Field
                label="Fino al"
                error={errors.endDay}
                hint={
                  dates.length
                    ? `Verranno create ${dates.length} spese, dal ${formatDate(dates[0])} al ${formatDate(dates.at(-1))}.`
                    : undefined
                }
              >
                {({ id, describedBy }) => (
                  <DateInput
                    id={id}
                    aria-describedby={describedBy}
                    value={draft.endDay}
                    onChange={(event) => set('endDay', event.target.value)}
                  />
                )}
              </Field>
            </div>
          )}
        </>
      )}
      {buy?.uid_father && (
        <p className="flex items-center gap-2 px-1 text-[13px] text-muted">
          <FiRepeat aria-hidden="true" /> Fa parte di una serie ricorrente: le modifiche valgono solo per questa spesa.
        </p>
      )}
      {buy &&
        (confirmSeries ? (
          <div className="flex flex-col gap-2 rounded-2xl border border-line p-3">
            <p className="text-[15px]">Eliminare solo questa spesa o tutta la serie ({family.length})?</p>
            <Button variant="destructive" onClick={deleteOne}>
              Solo questa
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                remove('buy', family, `${family.length} spese della serie eliminate`)
                onDone()
              }}
            >
              Tutta la serie ({family.length})
            </Button>
            <Button variant="plain" onClick={() => setConfirmSeries(false)}>
              Annulla
            </Button>
          </div>
        ) : (
          <Button variant="destructive" onClick={() => (buy.uid_father ? setConfirmSeries(true) : deleteOne())}>
            Elimina spesa
          </Button>
        ))}
    </form>
  )
}

/** Foglio "Nuova spesa" / "Modifica spesa". */
export default function BuyForm({
  id,
  group,
  formId,
  onDone,
  onCreateGroup,
}: FormProps & { group?: string; onCreateGroup: () => void }) {
  const buys = useBuys()
  const buy = id ? buys.data.find((item) => idOf(item) === id || item.id === id) : undefined
  return (
    <FormState id={id} status={buys.status} found={Boolean(buy)} onDone={onDone}>
      <BuyFormBody
        key={id ?? 'new'}
        buy={buy}
        group={group}
        formId={formId}
        onDone={onDone}
        onCreateGroup={onCreateGroup}
      />
    </FormState>
  )
}
