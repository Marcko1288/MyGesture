import { useEffect, useState } from 'react'
import { subscriptionStore } from '../../data/mutations'
import { toDate as toFirestoreDate } from '../../domain/dates'
import './SubscriptionDetailView.css'

const emptySubscription = {}

function inputDate(value) {
  const date = toFirestoreDate(value)
  if (!date) return ''
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return localDate.toISOString().slice(0, 10)
}

function initialDraft(subscription = {}) {
  return {
    name: subscription.name ?? '',
    amount: subscription.amount ?? 0,
    data_inizio: inputDate(subscription.data_inizio) || inputDate(new Date()),
    data_fine: inputDate(subscription.data_fine) || inputDate(new Date()),
  }
}

export default function SubscriptionDetailView({ subscription = emptySubscription, userId, onBack, onRenew }) {
  const isNew = !(subscription.uid ?? subscription.id)
  const [draft, setDraft] = useState(() => initialDraft(subscription))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setDraft(initialDraft(subscription))
    setError('')
  }, [subscription])

  async function save(event) {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      const values = {
        ...draft,
        amount: Number(draft.amount) || 0,
        data_inizio: new Date(`${draft.data_inizio}T00:00:00`).toISOString(),
        data_fine: new Date(`${draft.data_fine}T00:00:00`).toISOString(),
      }
      if (new Date(values.data_fine) < new Date(values.data_inizio)) {
        throw new Error('La data di scadenza deve essere successiva alla data di inizio.')
      }
      if (isNew) await subscriptionStore.create(values, userId)
      else await subscriptionStore.update(subscription.uid ?? subscription.id, values, userId)
      onBack()
    } catch (saveError) {
      setError(saveError.message || 'Non e stato possibile salvare l abbonamento.')
    } finally {
      setSaving(false)
    }
  }

  async function remove() {
    if (!window.confirm('Vuoi eliminare questo abbonamento?')) return
    setSaving(true)
    setError('')
    try {
      await subscriptionStore.remove(subscription.uid ?? subscription.id, userId)
      onBack()
    } catch (removeError) {
      setError(removeError.message || 'Non e stato possibile eliminare l abbonamento.')
    } finally {
      setSaving(false)
    }
  }

  function renew() {
    const start = toFirestoreDate(subscription.data_fine)
    if (!start) return
    start.setDate(start.getDate() + 1)
    const end = new Date(start)
    end.setFullYear(end.getFullYear() + 1)
    end.setDate(end.getDate() - 1)
    onRenew({
      ...subscription,
      uid: undefined,
      id: undefined,
      uid_father: subscription.uid_father || subscription.uid || subscription.id,
      data_inizio: start.toISOString(),
      data_fine: end.toISOString(),
    })
  }

  return (
    <>
      <div className="section-heading subscription-detail-heading">
        <div className="subscription-detail-header-actions">
          <button type="button" className="back-button" onClick={onBack}>
            Indietro
          </button>
          {!isNew && (
            <button type="button" className="renew-subscription" onClick={renew}>
              Rinnovo
            </button>
          )}
        </div>
        <h1>{isNew ? 'Nuovo abbonamento' : 'Dettaglio abbonamento'}</h1>
      </div>
      <form className="subscription-detail-card" onSubmit={save}>
        <label>
          Nome abbonamento
          <input
            value={draft.name}
            onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
            required
          />
        </label>
        <label>
          Importo
          <input
            type="number"
            min="0"
            step="0.01"
            value={draft.amount}
            onChange={(event) => setDraft((current) => ({ ...current, amount: event.target.value }))}
            required
          />
        </label>
        <label>
          Data inizio
          <input
            type="date"
            value={draft.data_inizio}
            onChange={(event) => setDraft((current) => ({ ...current, data_inizio: event.target.value }))}
            required
          />
        </label>
        <label>
          Data scadenza
          <input
            type="date"
            value={draft.data_fine}
            onChange={(event) => setDraft((current) => ({ ...current, data_fine: event.target.value }))}
            required
          />
        </label>
        {error && <p className="form-error">{error}</p>}
        <div className="subscription-detail-actions">
          <button type="submit" disabled={saving}>
            {saving ? 'Salvataggio...' : 'Salva'}
          </button>
          {!isNew && (
            <button type="button" className="delete-subscription" onClick={remove} disabled={saving}>
              Elimina
            </button>
          )}
        </div>
      </form>
    </>
  )
}
