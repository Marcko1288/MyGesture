import { toFirestoreDate } from '../utils/firestoreDate.js'
import './StatementCategoryView.css'

const formatCurrency = (value) =>
  new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(value)
const shortOperation = (value) => {
  const text = value || 'Operazione non disponibile'
  return text.length > 60 ? `${text.slice(0, 60)}…` : text
}

export default function StatementCategoryView({ category, selectedMonth, filter, bankRecords = [], onBack, onSelectRecord, onOpenTrend }) {
  const [year, month] = selectedMonth.split('-').map(Number)
  const start = new Date(year, month - 1, 1)
  const end = new Date(year, month, 0, 23, 59, 59, 999)
  const records = bankRecords
    .filter((record) => {
      const date = toFirestoreDate(record.data_valore)
      const amount = Number(record.amount) || 0
      const matchesFilter = filter === 'incoming' ? amount >= 0 : filter === 'outgoing' ? amount < 0 : true
      return date && date >= start && date <= end && matchesFilter && (record.new_category?.trim() || 'Spese') === category
    })
    .sort((a, b) => (toFirestoreDate(b.data_valore)?.getTime() ?? 0) - (toFirestoreDate(a.data_valore)?.getTime() ?? 0))

  return (
    <>
      <div className="section-heading statement-category-heading">
        <div className="statement-category-actions"><button type="button" className="back-button" onClick={onBack}>Indietro</button><button type="button" className="statement-trend-button" onClick={onOpenTrend}>Andamento</button></div>
        <h1>{category}</h1>
      </div>
      <section className="chart-card statement-category-card">
        {records.length ? records.map((record) => (
          <button type="button" className="statement-category-row" key={record.uid ?? record.id} onClick={() => onSelectRecord?.(record)}>
            <span>{toFirestoreDate(record.data_valore)?.toLocaleDateString('it-IT') || 'Data non disponibile'}</span>
            <strong>{shortOperation(record.operation)}</strong>
            <b>{formatCurrency(Number(record.amount) || 0)}</b>
          </button>
        )) : <p className="empty-chart">Non ci sono operazioni per questa categoria.</p>}
      </section>
    </>
  )
}
