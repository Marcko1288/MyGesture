import { useEffect, useState } from 'react'
import { FiBookOpen, FiCoffee, FiCreditCard, FiDollarSign, FiGift, FiHeart, FiHome, FiMoreHorizontal, FiShoppingBag, FiTruck } from 'react-icons/fi'
import { buyStore } from '../store/firestoreStore.jsx'
import { toFirestoreDate } from '../utils/firestoreDate.js'
import './BuyDetailView.css'
import './DetailInputs.css'

const buyIcons = [
  { id: 0, label: 'Amazon e acquisti', icon: FiShoppingBag },
  { id: 1, label: 'Casa', icon: FiHome },
  { id: 2, label: 'Carta e prestiti', icon: FiCreditCard },
  { id: 3, label: 'Trasporti', icon: FiTruck },
  { id: 4, label: 'Cibo e bar', icon: FiCoffee },
  { id: 5, label: 'Salute', icon: FiHeart },
  { id: 6, label: 'Regali', icon: FiGift },
  { id: 7, label: 'Libri e formazione', icon: FiBookOpen },
  { id: 8, label: 'Denaro', icon: FiDollarSign },
  { id: 9, label: 'Altro', icon: FiMoreHorizontal },
]
const emptyBuy = {}

function inputDateTime(value) {
  const date = toFirestoreDate(value)
  if (!date) return ''
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return localDate.toISOString().slice(0, 16)
}

function toIsoOrNull(value) {
  return value ? new Date(value).toISOString() : null
}

function recurringDates(draft) {
  const start = new Date(draft.data_valore)
  const end = new Date(draft.data_fine)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return []

  const dates = []
  if (draft.round === 'SET') {
    const weekdays = { DOM: 0, LUN: 1, MAR: 2, MER: 3, GIO: 4, VEN: 5, SAB: 6 }
    const targetDay = weekdays[draft.type_round]
    if (targetDay === undefined) return []
    const date = new Date(start)
    date.setDate(date.getDate() + ((targetDay - date.getDay() + 7) % 7))
    while (date <= end) {
      dates.push(new Date(date))
      date.setDate(date.getDate() + 7)
    }
    return dates
  }

  const date = new Date(start.getFullYear(), start.getMonth(), 1, start.getHours(), start.getMinutes())
  while (date <= end) {
    const candidate = new Date(date)
    if (draft.type_round === 'INI') candidate.setDate(1)
    else if (draft.type_round === 'FIN') candidate.setMonth(candidate.getMonth() + 1, 0)
    else candidate.setDate(Math.min(start.getDate(), new Date(candidate.getFullYear(), candidate.getMonth() + 1, 0).getDate()))
    if (candidate >= start && candidate <= end) dates.push(candidate)
    date.setMonth(date.getMonth() + 1)
  }
  return dates
}

function initialDraft(buy = {}) {
  return {
    amount: buy.amount ?? 0,
    data_fine: inputDateTime(buy.data_fine),
    data_valore: inputDateTime(buy.data_valore) || inputDateTime(new Date()),
    group: buy.group ?? '',
    icon: buy.icon ?? 0,
    name: buy.name ?? '',
    repeat: Boolean(buy.repeat),
    round: buy.round ?? '',
    type_round: buy.type_round ?? '',
    uid_father: buy.uid_father ?? '',
  }
}

export default function BuyDetailView({ buy = emptyBuy, userId, groupRecords = [], buyRecords = [], onBack }) {
  const isNew = !buy.uid
  const [draft, setDraft] = useState(() => initialDraft(buy))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [deleteChoiceOpen, setDeleteChoiceOpen] = useState(false)

  useEffect(() => {
    setDraft(initialDraft(buy))
    setError('')
  }, [buy])

  const change = (event) => {
    const { name, type, checked, value } = event.target
    setDraft((current) => ({
      ...current,
      [name]: type === 'checkbox' ? checked : value,
      ...(name === 'round' ? { type_round: '' } : {}),
    }))
  }

  async function save(event) {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      const values = {
          ...draft,
          amount: Number(draft.amount) || 0,
          icon: Number(draft.icon) || 0,
          data_valore: toIsoOrNull(draft.data_valore),
          data_fine: toIsoOrNull(draft.data_fine),
        }
      if (isNew && draft.repeat) {
        if (!draft.data_fine) throw new Error('Inserisci la data fine della ripetizione.')
        const dates = recurringDates(draft)
        if (!dates.length) throw new Error('La frequenza selezionata non genera date valide.')
        const rootUid = `BUY_${crypto.randomUUID().replaceAll('-', '').slice(0, 8).toUpperCase()}`
        for (const [index, date] of dates.entries()) {
          await buyStore.create({ ...values, uid: index === 0 ? rootUid : undefined, uid_father: rootUid, data_valore: date.toISOString() }, userId)
        }
      } else if (isNew) await buyStore.create(values, userId)
      else await buyStore.update(buy.uid, values, userId)
      onBack()
    } catch (saveError) {
      setError(saveError.message || 'Non è stato possibile salvare il Buy.')
    } finally {
      setSaving(false)
    }
  }

  async function remove(mode = 'single') {
    setSaving(true)
    setError('')
    try {
      const familyId = buy.uid_father || buy.uid
      const recordsToDelete = mode === 'family'
        ? buyRecords.filter((record) => record.uid === familyId || record.uid_father === familyId)
        : [buy]
      await Promise.all(recordsToDelete.map((record) => buyStore.remove(record.uid ?? record.id, userId)))
      onBack()
    } catch (deleteError) {
      setError(deleteError.message || 'Non è stato possibile eliminare il Buy.')
    } finally {
      setSaving(false)
    }
  }

  function askDelete() {
    if (buy.uid_father) setDeleteChoiceOpen(true)
    else if (window.confirm('Vuoi eliminare questo Buy?')) remove()
  }

  return (
    <>
      <div className="section-heading buy-detail-heading">
        <button type="button" className="back-button" onClick={onBack}>
          Indietro
        </button>
        <h1>{isNew ? 'Nuovo' : 'Dettaglio'}</h1>
      </div>
      <form className="buy-detail-card" onSubmit={save}>
        <div className="buy-detail-grid">
          <label>
            Etichetta
            <input name="name" value={draft.name} onChange={change} required />
          </label>
          <label>
            Importo
            <input name="amount" type="number" step="0.01" value={draft.amount} onChange={change} required />
          </label>
          <label>
            Data valore
            <input name="data_valore" type="datetime-local" value={draft.data_valore} onChange={change} required />
          </label>
          <label>
            Gruppo
            <select name="group" value={draft.group} onChange={change}>
              <option value="">Nessun gruppo</option>
              {groupRecords.map((group) => (
                <option key={group.uid ?? group.id} value={group.uid ?? group.id}>
                  {group.name || 'Gruppo senza nome'}
                </option>
              ))}
            </select>
          </label>
          <fieldset className="buy-icon-picker">
            <legend>Icona</legend>
            <div className="buy-icon-options">
              {buyIcons.map(({ id, label, icon: Icon }) => (
                <button
                  type="button"
                  key={id}
                  className={Number(draft.icon) === id ? 'selected' : ''}
                  aria-label={label}
                  aria-pressed={Number(draft.icon) === id}
                  title={label}
                  onClick={() => setDraft((current) => ({ ...current, icon: id }))}
                >
                  <Icon />
                </button>
              ))}
            </div>
          </fieldset>
          <label className="buy-repeat-field">
            <input name="repeat" type="checkbox" checked={draft.repeat} onChange={change} />
            <span className="buy-repeat-switch" aria-hidden="true" />
            <span>Ripeti</span>
          </label>
          {draft.repeat && (
            <>
              <label>
                Frequenza
                <select name="round" value={draft.round} onChange={change} required={draft.repeat}>
                  <option value="">Seleziona frequenza</option>
                  <option value="MEN">Mensile</option>
                  <option value="SET">Settimanale</option>
                </select>
              </label>
              <label>
                Tipo Frequenza
                <select name="type_round" value={draft.type_round} onChange={change} required={draft.repeat}>
                  <option value="">Seleziona opzione</option>
                  {draft.round === 'SET' ? (
                    <>
                      <option value="LUN">Lunedì</option>
                      <option value="MAR">Martedì</option>
                      <option value="MER">Mercoledì</option>
                      <option value="GIO">Giovedì</option>
                      <option value="VEN">Venerdì</option>
                      <option value="SAB">Sabato</option>
                      <option value="DOM">Domenica</option>
                    </>
                  ) : (
                    <>
                      <option value="DAT">Data specifica</option>
                      <option value="INI">Inizio mese</option>
                      <option value="FIN">Fine mese</option>
                    </>
                  )}
                </select>
              </label>
              <label>
                Data fine
                <input name="data_fine" type="datetime-local" value={draft.data_fine} onChange={change} required={draft.repeat} />
              </label>
            </>
          )}
        </div>
        {error && <p className="form-error">{error}</p>}
        <div className="buy-detail-actions">
          <button className="save-buy" type="submit" disabled={saving}>
            {saving ? 'Salvataggio...' : 'Salva'}
          </button>
          {!isNew && <button className="delete-buy" type="button" onClick={askDelete} disabled={saving}>Elimina</button>}
        </div>
      </form>
      {deleteChoiceOpen && (
        <div className="buy-delete-layer" onClick={() => setDeleteChoiceOpen(false)}>
          <div className="buy-delete-dialog" role="dialog" aria-modal="true" aria-label="Elimina Buy" onClick={(event) => event.stopPropagation()}>
            <h2>Elimina ricorrenza</h2>
            <p>Vuoi eliminare solo questa spesa oppure tutte le spese collegate?</p>
            <button type="button" className="delete-buy" onClick={() => { setDeleteChoiceOpen(false); remove('single') }}>Solo questa spesa</button>
            <button type="button" className="delete-buy" onClick={() => { setDeleteChoiceOpen(false); remove('family') }}>Tutte le spese collegate</button>
            <button type="button" className="cancel-delete-buy" onClick={() => setDeleteChoiceOpen(false)}>Annulla</button>
          </div>
        </div>
      )}
    </>
  )
}
