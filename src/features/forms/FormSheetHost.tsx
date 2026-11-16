import { useLocation, useNavigate } from 'react-router-dom'
import { paths, useSheet, type SheetKind } from '../../app/navigation'
import { BottomSheet, Button } from '../../ui'
import BuyForm from './BuyForm'
import CashForm from './CashForm'
import GroupForm from './GroupForm'
import SubscriptionForm from './SubscriptionForm'

const FORM_ID = 'sheet-form'

const titles: Record<SheetKind, [string, string]> = {
  spesa: ['Nuova spesa', 'Modifica spesa'],
  saldo: ['Nuovo saldo', 'Modifica saldo'],
  abbonamento: ['Nuovo abbonamento', 'Modifica abbonamento'],
  rinnovo: ['Rinnova abbonamento', 'Rinnova abbonamento'],
  gruppo: ['Nuovo gruppo', 'Modifica gruppo'],
}

/** Mostra il form richiesto da `?foglio=…&id=…` in un foglio dal basso, sopra la schermata corrente. */
export default function FormSheetHost() {
  const { kind, id, group, close, replace } = useSheet()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const isNew = kind === 'rinnovo' ? true : !id
  const title = kind ? titles[kind][id && kind !== 'rinnovo' ? 1 : 0] : ''

  return (
    <BottomSheet
      open={Boolean(kind)}
      onClose={close}
      title={title}
      footer={
        <Button type="submit" form={FORM_ID} block>
          {isNew ? (kind === 'rinnovo' ? 'Rinnova' : 'Aggiungi') : 'Salva'}
        </Button>
      }
    >
      {kind === 'spesa' && (
        <BuyForm id={id} group={group} formId={FORM_ID} onDone={close} onCreateGroup={() => replace('gruppo')} />
      )}
      {kind === 'saldo' && <CashForm id={id} formId={FORM_ID} onDone={close} />}
      {kind === 'gruppo' && (
        <GroupForm
          id={id}
          formId={FORM_ID}
          onDone={close}
          onDeleted={() =>
            pathname.startsWith('/spese/gruppi/') ? navigate(paths.expenses, { replace: true }) : close()
          }
        />
      )}
      {(kind === 'abbonamento' || kind === 'rinnovo') && (
        <SubscriptionForm
          id={id}
          mode={kind === 'rinnovo' ? 'renew' : id ? 'edit' : 'new'}
          formId={FORM_ID}
          onDone={close}
          onRenew={() => replace('rinnovo', id)}
        />
      )}
    </BottomSheet>
  )
}
