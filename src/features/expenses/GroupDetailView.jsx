import { useState } from 'react'
import { FiBriefcase, FiCoffee, FiCreditCard, FiDollarSign, FiHome, FiMoreHorizontal, FiShoppingBag, FiTool, FiTruck, FiUmbrella } from 'react-icons/fi'
import { groupStore } from '../store/firestoreStore.jsx'
import './GroupDetailView.css'

const groupIcons = [
  { id: 0, label: 'Acquisti', icon: FiShoppingBag },
  { id: 1, label: 'Casa', icon: FiHome },
  { id: 2, label: 'Prestiti e carte', icon: FiCreditCard },
  { id: 3, label: 'Viaggi e auto', icon: FiTruck },
  { id: 4, label: 'Cibo', icon: FiCoffee },
  { id: 5, label: 'Lavoro', icon: FiBriefcase },
  { id: 6, label: 'Servizi', icon: FiTool },
  { id: 7, label: 'Assicurazioni', icon: FiUmbrella },
  { id: 8, label: 'Denaro', icon: FiDollarSign },
  { id: 9, label: 'Altro', icon: FiMoreHorizontal },
]

export default function GroupDetailView({ group = {}, userId, buyRecords = [], onBack, onDeleted }) {
  const isNew = !group.uid
  const groupId = group.uid ?? group.id
  const hasLinkedBuys = buyRecords.some((buy) => buy.group === groupId)
  const [name, setName] = useState(group.name ?? '')
  const [icon, setIcon] = useState(Number(group.icon) || 0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function save(event) {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      if (isNew) await groupStore.create({ name, icon }, userId)
      else await groupStore.update(group.uid ?? group.id, { name, icon }, userId)
      onBack()
    } catch (saveError) {
      setError(saveError.message || 'Non è stato possibile salvare il gruppo.')
    } finally {
      setSaving(false)
    }
  }

  async function remove() {
    if (hasLinkedBuys || !window.confirm('Vuoi eliminare questo gruppo?')) return
    setSaving(true)
    setError('')
    try {
      await groupStore.remove(groupId, userId)
      if (onDeleted) onDeleted()
      else onBack()
    } catch (deleteError) {
      setError(deleteError.message || 'Non è stato possibile eliminare il gruppo.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div className="section-heading group-detail-heading">
        <button type="button" className="back-button" onClick={onBack}>Indietro</button>
        <h1>{isNew ? 'Nuovo' : 'Modifica'}</h1>
      </div>
      <form className="group-detail-card" onSubmit={save}>
        <label>
          Nome gruppo
          <input value={name} onChange={(event) => setName(event.target.value)} required />
        </label>
        <fieldset className="group-icon-picker">
          <legend>Icona</legend>
          <div className="group-icon-options">
            {groupIcons.map(({ id, label, icon: Icon }) => (
              <button type="button" key={id} className={icon === id ? 'selected' : ''} title={label} aria-label={label} aria-pressed={icon === id} onClick={() => setIcon(id)}>
                <Icon />
              </button>
            ))}
          </div>
        </fieldset>
        {error && <p className="form-error">{error}</p>}
        <div className="group-detail-actions">
          <button type="submit" disabled={saving}>{saving ? 'Salvataggio...' : 'Salva'}</button>
          {!isNew && <button type="button" className="delete-group" onClick={remove} disabled={saving || hasLinkedBuys} title={hasLinkedBuys ? 'Elimina prima tutti i Buy collegati' : undefined}>Elimina</button>}
        </div>
        {!isNew && hasLinkedBuys && <p className="group-delete-note">Non puoi eliminare il gruppo finché ha Buy collegati.</p>}
      </form>
    </>
  )
}
