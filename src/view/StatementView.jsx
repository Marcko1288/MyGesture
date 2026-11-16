import { useState } from 'react'
import { Cell, Label, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { FiCalendar, FiDownload } from 'react-icons/fi'
import { toFirestoreDate } from '../utils/firestoreDate.js'
import './StatementView.css'

const colors = ['#6366f1', '#22c55e', '#f59e0b', '#ec4899', '#0ea5e9', '#a855f7', '#f97316']
const formatCurrency = (value) =>
  new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(value)
const toMonthValue = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`

export default function StatementView({ bankRecords = [], onSelectCategory }) {
  const [filter, setFilter] = useState('outgoing')
  const today = new Date()
  const firstAvailableMonth = new Date(today.getFullYear(), today.getMonth() - 6, 1)
  const [selectedMonth, setSelectedMonth] = useState(() => toMonthValue(new Date(today.getFullYear(), today.getMonth() - 1, 1)))
  const availableMonths = []
  for (let date = new Date(firstAvailableMonth); date <= today; date.setMonth(date.getMonth() + 1)) {
    availableMonths.push(new Date(date))
  }
  const [year, month] = selectedMonth.split('-').map(Number)
  const previousMonthStart = new Date(year, month - 1, 1)
  const previousMonthEnd = new Date(year, month, 0, 23, 59, 59, 999)
  const previousMonthLabel = new Intl.DateTimeFormat('it-IT', { month: 'long', year: 'numeric' }).format(previousMonthStart)
  const byCategory = new Map()
  let signedTotal = 0

  bankRecords.forEach((record) => {
    const date = toFirestoreDate(record.data_valore)
    const amount = Number(record.amount) || 0
    const matchesFilter = filter === 'incoming' ? amount >= 0 : filter === 'outgoing' ? amount < 0 : true
    if (!date || date < previousMonthStart || date > previousMonthEnd || !matchesFilter) return
    signedTotal += amount
    const category = record.new_category?.trim() || 'Spese'
    byCategory.set(category, (byCategory.get(category) || 0) + Math.abs(amount))
  })

  const expenses = [...byCategory.entries()]
    .map(([name, value], index) => ({ name, value, color: colors[index % colors.length] }))
    .filter((item) => item.value > 0)
  const total = filter === 'all' ? signedTotal : expenses.reduce((sum, item) => sum + item.value, 0)
  const visibleRecords = bankRecords
    .filter((record) => {
      const date = toFirestoreDate(record.data_valore)
      const amount = Number(record.amount) || 0
      const matchesFilter = filter === 'incoming' ? amount >= 0 : filter === 'outgoing' ? amount < 0 : true
      return date && date >= previousMonthStart && date <= previousMonthEnd && matchesFilter
    })
    .sort((a, b) => (toFirestoreDate(b.data_valore)?.getTime() ?? 0) - (toFirestoreDate(a.data_valore)?.getTime() ?? 0))

  const exportCsv = () => {
    const headers = ['UID', 'Data', 'Operazione', 'Dettagli', 'Conto o carta', 'Contabilizzazione', 'Categoria', 'Valuta', 'Importo']
    const escapeCsv = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`
    const rows = visibleRecords.map((record) => [
      record.uid ?? record.id ?? '', toFirestoreDate(record.data_valore)?.toLocaleDateString('it-IT') || '', record.operation, record.detail,
      record.card, record.accounting, record.category, record.currency, record.amount,
    ].map(escapeCsv).join(';'))
    const blob = new Blob([`\uFEFF${headers.map(escapeCsv).join(';')}\n${rows.join('\n')}`], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `estratto-conto-${selectedMonth}-${filter}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <>
      <div className="section-heading statement-heading">
        <h1>Estratto Conto</h1>
        <button type="button" className="statement-download-button" onClick={exportCsv} disabled={!visibleRecords.length} aria-label="Scarica CSV" title="Scarica CSV"><FiDownload /></button>
      </div>
      <section className="chart-card expense-chart">
        <div className="statement-chart-heading">
          <div>
            <h2>{filter === 'incoming' ? 'Entrate per categoria' : filter === 'outgoing' ? 'Uscite per categoria' : 'Movimenti per categoria'}</h2>
            <p>Valore di {previousMonthLabel}: {formatCurrency(total)}</p>
          </div>
          <label className="statement-calendar-button" title="Scegli mese">
            <FiCalendar />
            <span className="visually-hidden">Scegli mese</span>
            <select className="statement-month-select" value={selectedMonth} onChange={(event) => setSelectedMonth(event.target.value)} aria-label="Scegli mese">
              {availableMonths.map((date) => {
                const value = toMonthValue(date)
                return <option key={value} value={value}>{new Intl.DateTimeFormat('it-IT', { month: 'long', year: 'numeric' }).format(date)}</option>
              })}
            </select>
          </label>
        </div>
        <div className="statement-filters" role="tablist" aria-label="Tipo di movimento">
          <button type="button" role="tab" aria-selected={filter === 'incoming'} className={filter === 'incoming' ? 'active' : ''} onClick={() => setFilter('incoming')}>Entrate</button>
          <button type="button" role="tab" aria-selected={filter === 'outgoing'} className={filter === 'outgoing' ? 'active' : ''} onClick={() => setFilter('outgoing')}>Uscite</button>
          <button type="button" role="tab" aria-selected={filter === 'all'} className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>Tutto</button>
        </div>
        {expenses.length ? (
          <div className="pie-layout">
            <div className="pie-wrap">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={expenses} dataKey="value" innerRadius={57} outerRadius={87} paddingAngle={4} onClick={(entry) => onSelectCategory(entry?.payload?.name ?? entry?.name, selectedMonth, filter)}>
                    {expenses.map((item) => <Cell key={item.name} fill={item.color} />)}
                    <Label value={previousMonthStart.getFullYear()} position="center" fill="var(--text-main)" fontSize={18} fontWeight={800} />
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul className="chart-legend">
              {expenses.map((item) => (
                <li key={item.name}>
                  <button type="button" className="statement-category-button" onClick={() => onSelectCategory(item.name, selectedMonth, filter)}>
                    <i style={{ background: item.color }} />
                    <span>{item.name}</span>
                    <b>{formatCurrency(item.value)}</b>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="empty-chart">Non ci sono movimenti nel mese selezionato.</p>
        )}
      </section>
    </>
  )
}
