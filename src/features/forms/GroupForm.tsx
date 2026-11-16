import { useState, type FormEvent } from 'react'
import { useUserId } from '../../data/auth'
import { useBuys, useGroups } from '../../data/hooks'
import { createRecord, updateRecord } from '../../data/mutations'
import { useOptimisticSave } from '../../data/optimistic'
import { useUndoableDelete } from '../../data/pendingDeletes'
import { idOf } from '../../domain/numbers'
import type { Group } from '../../domain/types'
import { Button, Chip, ChipRow, Field, TextInput } from '../../ui'
import { groupIcons } from '../shared/icons'
import { FormState, type FormProps } from './FormState'

function GroupFormBody({
  group,
  formId,
  onDone,
  onDeleted,
}: {
  group?: Group
  formId: string
  onDone: () => void
  onDeleted: () => void
}) {
  const userId = useUserId()
  const buys = useBuys()
  const save = useOptimisticSave()
  const remove = useUndoableDelete()
  const [name, setName] = useState(group?.name ?? '')
  const [icon, setIcon] = useState(Number(group?.icon) || 0)
  const [error, setError] = useState('')
  const linked = group ? buys.data.filter((buy) => buy.group === idOf(group)).length : 0

  function submit(event: FormEvent) {
    event.preventDefault()
    if (!name.trim()) {
      setError('Dai un nome al gruppo.')
      return
    }
    if (group) save(() => updateRecord('group', idOf(group), { name: name.trim(), icon }, userId), 'Gruppo aggiornato')
    else save(() => createRecord('group', { name: name.trim(), icon }, userId), 'Gruppo creato')
    onDone()
  }

  return (
    <form id={formId} onSubmit={submit} noValidate className="flex flex-col gap-4 pt-1">
      <Field label="Nome" error={error}>
        {({ id, describedBy }) => (
          <TextInput
            id={id}
            aria-describedby={describedBy}
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Es. Casa"
            autoFocus={!group}
            enterKeyHint="done"
          />
        )}
      </Field>
      <div className="flex flex-col gap-1">
        <span className="px-1 text-[13px] font-semibold text-muted">Icona</span>
        <ChipRow label="Icona del gruppo">
          {groupIcons.map(({ id, label, icon: Icon }) => (
            <Chip key={id} icon={<Icon />} selected={icon === id} onClick={() => setIcon(id)}>
              {label}
            </Chip>
          ))}
        </ChipRow>
      </div>
      {group &&
        (linked ? (
          <p className="px-1 text-[13px] text-muted">
            Non puoi eliminare il gruppo finché ha {linked} {linked === 1 ? 'spesa collegata' : 'spese collegate'}.
          </p>
        ) : (
          <Button
            variant="destructive"
            onClick={() => {
              remove('group', [group], `Gruppo ${group.name || ''} eliminato`)
              onDeleted()
            }}
          >
            Elimina gruppo
          </Button>
        ))}
    </form>
  )
}

/** Foglio "Nuovo gruppo" / "Modifica gruppo". L'inclusione nei totali (campo `all`) non si modifica da qui. */
export default function GroupForm({ id, formId, onDone, onDeleted }: FormProps & { onDeleted: () => void }) {
  const groups = useGroups()
  const group = id ? groups.data.find((item) => idOf(item) === id || item.id === id) : undefined
  return (
    <FormState id={id} status={groups.status} found={Boolean(group)} onDone={onDone}>
      <GroupFormBody key={id ?? 'new'} group={group} formId={formId} onDone={onDone} onDeleted={onDeleted} />
    </FormState>
  )
}
