import { useMemo, useState } from 'react'
import {
  FiBookOpen,
  FiCoffee,
  FiCreditCard,
  FiDollarSign,
  FiGift,
  FiHeart,
  FiHome,
  FiMoreHorizontal,
  FiShoppingBag,
  FiTruck,
} from 'react-icons/fi'
import { buyPeriod } from '../../domain/dates'
import { toDate as toFirestoreDate } from '../../domain/dates'
import './GroupBuysView.css'

const filters = [
  { id: 'all', label: 'Tutto' },
  { id: 'current', label: 'Anno corrente' },
  { id: 'past', label: 'Passati' },
  { id: 'future', label: 'Futuri' },
]

const buyIcons = [
  FiShoppingBag,
  FiHome,
  FiCreditCard,
  FiTruck,
  FiCoffee,
  FiHeart,
  FiGift,
  FiBookOpen,
  FiDollarSign,
  FiMoreHorizontal,
]

const formatCurrency = (value) =>
  new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(Number(value) || 0)

export default function GroupBuysView({ group, buyRecords = [], onBack, onSelectBuy, onEditGroup }) {
  const [filter, setFilter] = useState('current')
  const records = useMemo(
    () =>
      buyRecords
        .filter(
          (buy) => buy.group === (group.uid ?? group.id) && (filter === 'all' || buyPeriod(buy.data_valore) === filter),
        )
        .sort(
          (a, b) => (toFirestoreDate(b.data_valore)?.getTime() ?? 0) - (toFirestoreDate(a.data_valore)?.getTime() ?? 0),
        ),
    [buyRecords, filter, group],
  )
  const total = records.reduce((sum, buy) => sum + (Number(buy.amount) || 0), 0)

  return (
    <>
      <div className="section-heading group-buys-heading">
        <div className="group-buys-header-actions">
          <button type="button" className="back-button" onClick={onBack}>
            Indietro
          </button>
          <button type="button" className="group-edit-button" onClick={onEditGroup}>
            Modifica
          </button>
        </div>
        <h1>{group.name || 'Gruppo senza nome'}</h1>
        <div className="group-buys-filters">
          <div className="period-selector" role="tablist" aria-label="Periodo dei Buy">
            {filters.map((item) => (
              <button
                type="button"
                key={item.id}
                role="tab"
                aria-selected={filter === item.id}
                className={filter === item.id ? 'active' : ''}
                onClick={() => setFilter(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>
      <section className="chart-card group-buys-card">
        <div className="group-buys-toolbar">
          <strong>{formatCurrency(total)}</strong>
        </div>
        {records.length ? (
          <div className="group-buys-list">
            {records.map((buy) => {
              const date = toFirestoreDate(buy.data_valore)
              const Icon = buyIcons[Number(buy.icon)] ?? buyIcons[9]
              return (
                <button
                  type="button"
                  className="group-buy-row"
                  key={buy.uid ?? buy.id}
                  onClick={() => onSelectBuy(buy)}
                >
                  <span className="group-buy-icon">
                    <Icon />
                  </span>
                  <div>
                    <strong>{buy.name || 'Buy senza nome'}</strong>
                    <span>{date ? date.toLocaleDateString('it-IT') : 'Data non disponibile'}</span>
                  </div>
                  <b>{formatCurrency(buy.amount)}</b>
                </button>
              )
            })}
          </div>
        ) : (
          <p className="empty-chart">Non ci sono spese per il filtro selezionato.</p>
        )}
      </section>
    </>
  )
}
