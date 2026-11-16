import { toFirestoreDate } from '../utils/firestoreDate.js'
import { isCurrentYearToDate } from '../utils/buyDateFilters.js'
import { FiBarChart2, FiBell, FiPieChart, FiTrendingUp } from 'react-icons/fi'
import './HomeView.css'

export default function HomeView({
  latestCash,
  previousCash,
  cashError,
  buyRecords = [],
  groupRecords = [],
  bankRecords = [],
  subscriptionRecords = [],
  buyError,
  onSelectCash,
  onOpenExpenses,
  onOpenStatement,
  onOpenSubscriptions,
}) {
  const toNumber = (value) => Number(value) || 0
  const formatCurrency = (value) =>
    `${new Intl.NumberFormat('it-IT', { useGrouping: true, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)} €`
  const formatDate = (value) => {
    const date = toFirestoreDate(value)
    return date ? date.toLocaleDateString('it-IT') : null
  }
  const cashTotal = (cash) =>
    cash ? toNumber(cash.conto) + toNumber(cash.anticipo) + toNumber(cash.otherp) - toNumber(cash.otherm) : null

  const total = cashTotal(latestCash)
  const previousTotal = cashTotal(previousCash)
  const delta = total !== null && previousTotal !== null ? total - previousTotal : null
  const totalLabel = total === null ? '--' : formatCurrency(total)
  const deltaLabel = delta === null ? null : `${delta > 0 ? '+' : ''}${formatCurrency(delta)}`
  const updatedLabel = formatDate(latestCash?.data_valore ?? latestCash?.data_ins)
  const currentYear = new Date().getFullYear()
  const includedGroupIds = new Set(
    groupRecords.filter((group) => group.all === true).map((group) => group.uid ?? group.id),
  )
  const yearlyExpenses = buyRecords
    .filter((buy) => {
      return isCurrentYearToDate(buy.data_valore) && includedGroupIds.has(buy.group)
    })
    .reduce((sum, buy) => sum + toNumber(buy.amount), 0)
  const previousMonthStart = new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1)
  const previousMonthEnd = new Date(new Date().getFullYear(), new Date().getMonth(), 0, 23, 59, 59, 999)
  const previousMonthBankRecords = bankRecords.filter((record) => {
    const date = toFirestoreDate(record.data_valore)
    return date && date >= previousMonthStart && date <= previousMonthEnd
  })
  const previousMonthPositive = previousMonthBankRecords
    .filter((record) => toNumber(record.amount) >= 0)
    .reduce((sum, record) => sum + toNumber(record.amount), 0)
  const previousMonthNegative = previousMonthBankRecords
    .filter((record) => toNumber(record.amount) < 0)
    .reduce((sum, record) => sum + toNumber(record.amount), 0)
  const previousMonthSavings = previousMonthBankRecords
    .filter((record) => String(record.category).trim() === 'Investimenti, BDR e Salvadanaio')
    .reduce((sum, record) => sum + toNumber(record.amount), 0) * -1
  const previousMonthLabel = new Intl.DateTimeFormat('it-IT', { month: 'long', year: 'numeric' }).format(previousMonthStart)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const nextMonth = new Date(today)
  nextMonth.setMonth(nextMonth.getMonth() + 1)
  const expiringSubscriptions = subscriptionRecords.filter((subscription) => {
    const expiryDate = toFirestoreDate(subscription.data_fine)
    return expiryDate && expiryDate >= today && expiryDate <= nextMonth
  }).length

  return (
    <>
      <div className="section-heading">
        <h1>Home</h1>
      </div>
      <div className="summary-grid">
        <article
          className={`stat-card cash-card ${latestCash ? 'clickable' : ''}`}
          role={latestCash ? 'button' : undefined}
          tabIndex={latestCash ? 0 : undefined}
          onClick={() => latestCash && onSelectCash(latestCash)}
          onKeyDown={(event) => {
            if (latestCash && (event.key === 'Enter' || event.key === ' ')) onSelectCash(latestCash)
          }}
        >
          <span className="cash-card-title card-title-with-icon"><FiBarChart2 className="balance-card-icon" /><span>Ultimo saldo</span></span>
          <strong className="cash-total">{totalLabel}</strong>
          {deltaLabel && <small className={`cash-delta ${delta >= 0 ? 'positive' : 'negative'}`}>{deltaLabel}</small>}
          <small className={`updated-label ${cashError ? 'card-error' : ''}`}>
            {cashError
              ? 'Impossibile recuperare il saldo'
              : updatedLabel
                ? `Valore al ${updatedLabel}`
                : 'Nessun dato Cash disponibile'}
          </small>
        </article>
        <article
          className="stat-card cash-card clickable"
          role="button"
          tabIndex={0}
          onClick={onOpenExpenses}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') onOpenExpenses()
          }}
        >
          <span className="cash-card-title card-title-with-icon"><FiPieChart className="expenses-card-icon" /><span>Spese dell'anno</span></span>
          <strong className="cash-total">{buyError ? '--' : formatCurrency(yearlyExpenses)}</strong>
          <small className={`updated-label ${buyError ? 'card-error' : ''}`}>
            {buyError ? 'Impossibile recuperare le spese' : `Valore del ${currentYear}`}
          </small>
        </article>
        <article className="stat-card cash-card clickable spending-trend-card" role="button" tabIndex={0} onClick={onOpenStatement} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') onOpenStatement() }}>
          <span className="cash-card-title card-title-with-icon"><FiTrendingUp className="trend-card-icon" /><span>Andamento Spese</span></span>
          <div className="spending-trend-values">
            <strong className="cash-total">{formatCurrency(previousMonthPositive)}</strong>
            <strong className="cash-total">{formatCurrency(previousMonthNegative)}</strong>
            <small className="cash-delta spending-trend-savings">Salvadanaio: {formatCurrency(previousMonthSavings)}</small>
          </div>
          <small className="spending-trend-period">Valore di {previousMonthLabel}</small>
        </article>
        <article className="stat-card cash-card clickable subscription-card" role="button" tabIndex={0} onClick={onOpenSubscriptions} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') onOpenSubscriptions() }}>
          <span className="cash-card-title card-title-with-icon"><FiBell className="subscription-card-icon" /><span>Abbonamenti in scadenza</span></span>
          <strong className="cash-total">{expiringSubscriptions}</strong>
        </article>
      </div>
    </>
  )
}
