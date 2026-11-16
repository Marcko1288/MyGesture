import { toFirestoreDate } from '../utils/firestoreDate.js'
import { FiDownload } from 'react-icons/fi'

function cashTotal(cash) {
  const number = (value) => Number(value) || 0
  return number(cash.conto) + number(cash.anticipo) + number(cash.otherp) - number(cash.otherm)
}

function csvValue(value) {
  if (value == null) return ''

  const date = toFirestoreDate(value)
  if (date && typeof value === 'object') return date.toISOString()
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

function exportCsv(records) {
  const columns = [...new Set(records.flatMap((record) => Object.keys(record)))].sort()
  const escape = (value) => `"${csvValue(value).replaceAll('"', '""')}"`
  const rows = records.map((record) => columns.map((column) => escape(record[column])).join(';'))
  const csv = `\uFEFF${columns.map(escape).join(';')}\n${rows.join('\n')}`
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download = `storico-cash-${new Date().toISOString().slice(0, 10)}.csv`
  document.body.append(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

export default function CashHistoryView({ cashRecords, onBack, onSelectCash }) {
  const rows = [...cashRecords]
    .sort(
      (a, b) =>
        (toFirestoreDate(b.data_valore ?? b.data_ins)?.getTime() ?? 0) -
        (toFirestoreDate(a.data_valore ?? a.data_ins)?.getTime() ?? 0),
    )
    .map((cash) => ({
      uid: cash.uid ?? cash.id,
      cash,
      date: toFirestoreDate(cash.data_valore ?? cash.data_ins),
      total: cashTotal(cash),
    }))

  return (
    <>
      <div className="section-heading cash-history-heading">
        <div className="cash-history-actions">
          <button type="button" className="back-button" onClick={onBack}>
            Indietro
          </button>
          <button
            type="button"
            className="cash-history-download-button"
            onClick={() => exportCsv(cashRecords)}
            disabled={!cashRecords.length}
            aria-label="Scarica CSV"
            title="Scarica CSV"
          >
            <FiDownload />
          </button>
        </div>
        <h1>Storico</h1>
      </div>
      <section className="chart-card cash-history-card">
        {rows.length ? (
          <div className="cash-history-list">
            <div className="cash-history-row cash-history-labels">
              <span>Data valore</span>
              <span>Totale</span>
            </div>
            {rows.map((row) => (
              <button
                type="button"
                className="cash-history-row cash-history-entry"
                key={row.uid}
                onClick={() => onSelectCash(row.cash)}
              >
                <span>{row.date ? row.date.toLocaleDateString('it-IT') : 'Data non disponibile'}</span>
                <strong>
                  {new Intl.NumberFormat('it-IT', {
                    style: 'currency',
                    currency: 'EUR',
                  }).format(row.total)}
                </strong>
              </button>
            ))}
          </div>
        ) : (
          <p className="empty-chart">Non ci sono ancora dati Cash da mostrare.</p>
        )}
      </section>
    </>
  )
}
