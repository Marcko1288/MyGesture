import { toDate as toFirestoreDate } from '../../domain/dates'
import './StatementDetailView.css'

const formatCurrency = (value, currency = 'EUR') =>
  new Intl.NumberFormat('it-IT', { style: 'currency', currency: currency || 'EUR' }).format(Number(value) || 0)

const formatDate = (value) => {
  const date = toFirestoreDate(value)
  return date ? date.toLocaleDateString('it-IT') : 'Non disponibile'
}

const fields = [
  ['Data', 'data_valore', formatDate],
  ['Operazione', 'operation'],
  ['Dettagli', 'detail'],
  ['Conto o carta', 'card'],
  ['Contabilizzazione', 'accounting'],
  ['Categoria', 'category'],
  ['Valuta', 'currency'],
]

export default function StatementDetailView({ record, onBack }) {
  return (
    <>
      <div className="section-heading statement-detail-heading">
        <button type="button" className="back-button" onClick={onBack}>
          Indietro
        </button>
        <h1>Dettaglio operazione</h1>
      </div>
      <section className="chart-card statement-detail-card" aria-label="Dettaglio operazione">
        {fields.map(([label, key, formatter]) => (
          <div className="statement-detail-field" key={key}>
            <span>{label}</span>
            <strong>{formatter ? formatter(record[key]) : record[key] || 'Non disponibile'}</strong>
          </div>
        ))}
        <div className="statement-detail-field statement-detail-amount">
          <span>Importo</span>
          <strong>{formatCurrency(record.amount, record.currency)}</strong>
        </div>
      </section>
    </>
  )
}
