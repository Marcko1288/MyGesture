import { useEffect, useMemo, useState } from 'react'
import { cashStore } from '../../data/mutations'
import { toDate as toFirestoreDate } from '../../domain/dates'
import { isCurrentYearToDate } from '../../domain/dates'
import './CashDetailView.css'
import '../expenses/DetailInputs.css'

const emptyCash = { data_valore: new Date().toISOString().slice(0, 10), conto: 0, anticipo: 0, otherp: 0, otherm: 0 }
const number = (value) => Number(value) || 0
const totalFor = (cash) => number(cash.conto) + number(cash.anticipo) + number(cash.otherp) - number(cash.otherm)
const inputDate = (value) => {
  const date = toFirestoreDate(value)
  return date ? date.toISOString().slice(0, 10) : ''
}

export default function CashDetailView({ cash, userId, buyRecords = [], groupRecords = [], onBack }) {
  const [draft, setDraft] = useState(emptyCash)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [isNew, setIsNew] = useState(!cash?.uid)

  useEffect(() => {
    setDraft(cash?.uid ? { ...cash, data_valore: inputDate(cash.data_valore) } : emptyCash)
    setIsNew(!cash?.uid)
    setError('')
  }, [cash])

  const total = useMemo(() => totalFor(draft), [draft])
  const change = (event) =>
    setDraft((current) => ({
      ...current,
      [event.target.name]: event.target.type === 'number' ? event.target.value : event.target.value,
    }))
  const importYearlyExpenses = () => {
    const includedGroupIds = new Set(
      groupRecords.filter((group) => group.all === true).map((group) => group.uid ?? group.id),
    )
    const totalExpenses = buyRecords
      .filter((buy) => isCurrentYearToDate(buy.data_valore) && includedGroupIds.has(buy.group))
      .reduce((sum, buy) => sum + number(buy.amount), 0)
    setDraft((current) => ({ ...current, anticipo: totalExpenses }))
  }

  async function save(event) {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      const values = {
        data_valore: draft.data_valore,
        conto: number(draft.conto),
        anticipo: number(draft.anticipo),
        otherp: number(draft.otherp),
        otherm: number(draft.otherm),
      }
      if (isNew) await cashStore.create(values, userId)
      else await cashStore.update(cash.uid, values, userId)
      onBack()
    } catch (saveError) {
      setError(saveError.message || 'Non e stato possibile salvare il Cash.')
    } finally {
      setSaving(false)
    }
  }

  async function remove() {
    if (!window.confirm('Vuoi eliminare questo Cash?')) return
    setSaving(true)
    setError('')
    try {
      await cashStore.remove(cash.uid, userId)
      onBack()
    } catch (deleteError) {
      setError(deleteError.message || 'Non e stato possibile eliminare il Cash.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div className="section-heading cash-detail-heading">
        <button type="button" className="back-button" onClick={onBack}>
          Indietro
        </button>
        <h1>{isNew ? 'Nuovo' : 'Dettaglio'}</h1>
      </div>
      <form className="cash-detail-card" onSubmit={save}>
        <label>
          Data valore
          <input name="data_valore" type="date" value={draft.data_valore ?? ''} onChange={change} required />
        </label>
        <div className="cash-fields">
          <label>
            Conto
            <input name="conto" type="number" step="0.01" value={draft.conto ?? ''} onChange={change} />
          </label>
          <label className="cash-expense-field">
            <span>
              Spese
              {isNew && (
                <button type="button" onClick={importYearlyExpenses}>
                  Importa Spese
                </button>
              )}
            </span>
            <input name="anticipo" type="number" step="0.01" value={draft.anticipo ?? ''} onChange={change} />
          </label>
          <label>
            Altri accrediti
            <input name="otherp" type="number" step="0.01" value={draft.otherp ?? ''} onChange={change} />
          </label>
          <label>
            Altri addebiti
            <input name="otherm" type="number" step="0.01" value={draft.otherm ?? ''} onChange={change} />
          </label>
        </div>
        <div className="cash-total-preview">
          <span>Totale</span>
          <strong>{new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(total)}</strong>
        </div>
        {error && <p className="form-error">{error}</p>}
        <div className="cash-detail-actions">
          <button className="save-cash" type="submit" disabled={saving}>
            {saving ? 'Salvataggio...' : 'Salva'}
          </button>
          {!isNew && (
            <button className="delete-cash" type="button" onClick={remove} disabled={saving}>
              Elimina
            </button>
          )}
        </div>
      </form>
    </>
  )
}
