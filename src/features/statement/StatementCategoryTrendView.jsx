import { useState } from 'react'
import { Line, LineChart, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { FiChevronDown, FiChevronUp } from 'react-icons/fi'
import { toFirestoreDate } from '../utils/firestoreDate.js'
import './StatementCategoryTrendView.css'

const formatCurrency = (value) =>
  new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(Number(value) || 0)

const monthLabel = (date) => new Intl.DateTimeFormat('it-IT', { month: 'long', year: 'numeric' }).format(date)
const shortOperation = (value) => {
  const text = value || 'Operazione non disponibile'
  return text.length > 60 ? `${text.slice(0, 60)}…` : text
}

export default function StatementCategoryTrendView({ category, selectedMonth, filter, bankRecords = [], onBack, onSelectRecord }) {
  const [expandedMonths, setExpandedMonths] = useState([])
  const [year, month] = selectedMonth.split('-').map(Number)
  const endMonth = new Date(year, month - 1, 1)
  const months = Array.from({ length: 4 }, (_, index) => new Date(year, month - 4 + index, 1))
  const records = bankRecords.filter((record) => {
    const date = toFirestoreDate(record.data_valore)
    const amount = Number(record.amount) || 0
    const matchesFilter = filter === 'incoming' ? amount >= 0 : filter === 'outgoing' ? amount < 0 : true
    const matchesCategory = (record.new_category?.trim() || 'Spese') === category
    return date && date >= months[0] && date < new Date(endMonth.getFullYear(), endMonth.getMonth() + 1, 1) && matchesFilter && matchesCategory
  })
  const chartData = months.map((start) => {
    const end = new Date(start.getFullYear(), start.getMonth() + 1, 1)
    const monthRecords = records.filter((record) => {
      const date = toFirestoreDate(record.data_valore)
      return date >= start && date < end
    })
    return {
      key: `${start.getFullYear()}-${start.getMonth()}`,
      label: new Intl.DateTimeFormat('it-IT', { month: 'short' }).format(start),
      month: monthLabel(start),
      value: monthRecords.reduce((sum, record) => sum + Math.abs(Number(record.amount) || 0), 0),
      records: monthRecords.sort((a, b) => (toFirestoreDate(b.data_valore)?.getTime() ?? 0) - (toFirestoreDate(a.data_valore)?.getTime() ?? 0)),
    }
  })

  return (
    <>
      <div className="section-heading statement-trend-heading">
        <button type="button" className="back-button" onClick={onBack}>Indietro</button>
        <h1>Andamento</h1>
        <p>{category}</p>
      </div>
      <section className="chart-card statement-trend-chart">
        <h2>Ultimi 4 mesi</h2>
        <div className="statement-trend-wrap">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 34, right: 8, left: -12, bottom: 0 }}>
              <XAxis dataKey="label" tickLine={false} axisLine={false} />
              <YAxis tickLine={false} axisLine={false} tickFormatter={(value) => new Intl.NumberFormat('it-IT', { notation: 'compact', maximumFractionDigits: 1 }).format(value)} />
              <Tooltip formatter={(value) => formatCurrency(Math.abs(value))} labelFormatter={(_, payload) => payload?.[0]?.payload?.month || ''} />
              <Line type="monotone" dataKey="value" stroke="var(--accent-color)" strokeWidth={3} dot={{ r: 4, fill: 'var(--accent-color)' }} activeDot={{ r: 6 }}>
                <LabelList dataKey="value" position="top" offset={12} formatter={(value) => formatCurrency(Math.abs(value))} fill="var(--text-main)" fontSize={12} fontWeight={700} />
              </Line>
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>
      <section className="chart-card statement-trend-details">
        <h2>Dettaglio per mese</h2>
        {chartData.map((item) => (
          <div className="statement-trend-month" key={item.key}>
            <div className="statement-trend-month-heading"><strong>{item.month}</strong><b>{formatCurrency(item.value)}</b><button type="button" className="statement-expand-button" aria-label={expandedMonths.includes(item.key) ? `Riduci ${item.month}` : `Espandi ${item.month}`} title={expandedMonths.includes(item.key) ? 'Riduci' : 'Espandi'} onClick={() => setExpandedMonths((current) => current.includes(item.key) ? current.filter((key) => key !== item.key) : [...current, item.key])}>{expandedMonths.includes(item.key) ? <FiChevronUp /> : <FiChevronDown />}</button></div>
            {expandedMonths.includes(item.key) && (item.records.length ? item.records.map((record) => (
              <button type="button" className="statement-category-row" key={record.uid ?? record.id} onClick={() => onSelectRecord?.(record)}>
                <span>{toFirestoreDate(record.data_valore)?.toLocaleDateString('it-IT') || 'Data non disponibile'}</span>
                <strong>{shortOperation(record.operation)}</strong>
                <b>{formatCurrency(Math.abs(Number(record.amount) || 0))}</b>
              </button>
            )) : <p className="statement-trend-empty">Nessun movimento.</p>)}
          </div>
        ))}
      </section>
    </>
  )
}
