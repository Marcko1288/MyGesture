import { useMemo } from 'react'
import {
  FiBell,
  FiBookOpen,
  FiCloud,
  FiCreditCard,
  FiFilm,
  FiMusic,
  FiShoppingBag,
  FiSmartphone,
  FiTv,
  FiWifi,
} from 'react-icons/fi'
import { toDate as toFirestoreDate } from '../../domain/dates'
import './SubscriptionsView.css'

const filters = [
  { id: 'all', label: 'Tutti' },
  { id: 'past', label: 'Passati' },
  { id: 'active', label: 'Attivi' },
  { id: 'expiring', label: 'In Scadenza' },
]
const startOfDay = (value = new Date()) => {
  const date = new Date(value)
  date.setHours(0, 0, 0, 0)
  return date
}
const subscriptionIcon = (name = '') => {
  const normalized = String(name).toLocaleLowerCase('it-IT')
  if (/(netflix|disney|prime video|amazon prime|now tv|sky|streaming|cinema)/.test(normalized)) return FiTv
  if (/(spotify|apple music|musica|music|tidal|audible)/.test(normalized)) return FiMusic
  if (/(icloud|google drive|dropbox|onedrive|cloud|storage)/.test(normalized)) return FiCloud
  if (/(telefono|mobile|sim|vodafone|tim |wind|iliad|ho\.|fastweb mobile)/.test(normalized)) return FiSmartphone
  if (/(internet|fibra|wifi|wi-fi|adsl)/.test(normalized)) return FiWifi
  if (/(libro|book|kindle|giornale|rivista|corso|udemy)/.test(normalized)) return FiBookOpen
  if (/(amazon|shop|acquisto|shopping)/.test(normalized)) return FiShoppingBag
  if (/(carta|card|paypal|banca|bank)/.test(normalized)) return FiCreditCard
  if (/(film|video|youtube)/.test(normalized)) return FiFilm
  return FiBell
}

export default function SubscriptionsView({
  subscriptionRecords = [],
  filter = 'active',
  onFilterChange,
  onSelectSubscription,
}) {
  const setFilter = onFilterChange
  const today = startOfDay()
  const nextMonth = new Date(today)
  nextMonth.setMonth(nextMonth.getMonth() + 1)
  const records = useMemo(
    () =>
      subscriptionRecords
        .filter((subscription) => {
          const start = toFirestoreDate(subscription.data_inizio)
          const end = toFirestoreDate(subscription.data_fine)
          if (filter === 'all') return true
          if (!end) return false
          if (filter === 'past') return end < today
          if (filter === 'expiring') return end >= today && end <= nextMonth
          return (!start || start <= today) && end >= today
        })
        .sort(
          (a, b) => (toFirestoreDate(a.data_fine)?.getTime() ?? 0) - (toFirestoreDate(b.data_fine)?.getTime() ?? 0),
        ),
    [filter, nextMonth, subscriptionRecords, today],
  )

  return (
    <>
      <div className="section-heading subscriptions-heading">
        <h1>Abbonamenti</h1>
        <div className="period-selector subscriptions-filters" role="tablist" aria-label="Stato abbonamenti">
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
      <section className="chart-card subscriptions-card">
        {records.length ? (
          <div className="subscriptions-list">
            {records.map((subscription) => {
              const expiryDate = toFirestoreDate(subscription.data_fine)
              const Icon = subscriptionIcon(subscription.name)
              return (
                <button
                  type="button"
                  className="subscription-row"
                  key={subscription.uid ?? subscription.id}
                  onClick={() => onSelectSubscription(subscription)}
                >
                  <span className="subscription-row-icon">
                    <Icon />
                  </span>
                  <div>
                    <strong>{subscription.name || 'Abbonamento senza nome'}</strong>
                    <span>Scade il {expiryDate?.toLocaleDateString('it-IT')}</span>
                  </div>
                  <b>
                    {new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(
                      Number(subscription.amount) || 0,
                    )}
                  </b>
                </button>
              )
            })}
          </div>
        ) : (
          <p className="empty-chart">Non ci sono abbonamenti per il filtro selezionato.</p>
        )}
      </section>
    </>
  )
}
