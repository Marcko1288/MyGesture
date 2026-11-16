import { useRef, useState } from 'react'
import * as XLSX from 'xlsx'
import { bankStore } from '../store/firestoreStore.jsx'
import './UploadStatementView.css'

function toBankDate(value) {
  if (value instanceof Date) return value.toISOString()
  if (typeof value === 'number') {
    const date = XLSX.SSF.parse_date_code(value)
    return date ? new Date(date.y, date.m - 1, date.d, 12).toISOString() : null
  }
  const match = String(value ?? '').trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/)
  if (!match) return null
  const [, month, day, yearValue] = match
  const year = yearValue.length === 2 ? 2000 + Number(yearValue) : Number(yearValue)
  const date = new Date(year, Number(month) - 1, Number(day), 12)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

function toAmount(value) {
  const amount = Number(String(value ?? '').replaceAll(',', '').trim())
  return Number.isFinite(amount) ? amount : null
}

function downloadErrorCsv(rows) {
  const headers = ['Data', 'Operazione', 'Dettagli', 'Conto o carta', 'Contabilizzazione', 'Categoria', 'Valuta', 'Importo', 'Errore']
  const escape = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`
  const csv = `\uFEFF${headers.join(';')}\n${rows.map((row) => [...row.values, row.error].map(escape).join(';')).join('\n')}`
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = 'errori-importazione-estratto-conto.csv'
  document.body.append(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

export default function UploadStatementView({ userId, onBack }) {
  const inputRef = useRef(null)
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [progress, setProgress] = useState(null)

  async function importFile(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    setUploading(true)
    setError('')
    setResult(null)
    setProgress(null)
    try {
      const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true })
      const table = workbook.SheetNames
        .map((name) => {
          const sheet = workbook.Sheets[name]
          const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: false })
          const headerIndex = rows.findIndex((row) => {
            const cells = row.map((value) => String(value).trim().toLowerCase())
            return cells.includes('data') && cells.includes('operazione') && cells.includes('importo')
          })
          return headerIndex >= 0 ? { sheet, headerIndex } : null
        })
        .find(Boolean)
      if (!table) throw new Error('Non trovo le intestazioni Data, Operazione e Importo nel file XLSX.')

      const rows = XLSX.utils.sheet_to_json(table.sheet, { header: 1, defval: '', raw: true }).slice(table.headerIndex + 1)
      const records = rows.filter((row) => row.some((value) => value !== '' && value != null))
      const errors = []
      let imported = 0
      setProgress({ total: records.length, processed: 0 })

      for (const [index, values] of records.entries()) {
        const data_valore = toBankDate(values[0])
        const amount = toAmount(values[7])
        if (!data_valore || amount === null) {
          errors.push({ values, error: !data_valore ? 'Data non valida' : 'Importo non valido' })
          setProgress({ total: records.length, processed: index + 1 })
          continue
        }
        try {
          await bankStore.create({ data_valore, operation: values[1], detail: values[2], card: values[3], accounting: values[4], category: values[5], currency: values[6], amount }, userId)
          imported += 1
        } catch (rowError) {
          errors.push({ values, error: rowError.message || 'Errore nel salvataggio' })
        }
        setProgress({ total: records.length, processed: index + 1 })
      }
      if (errors.length) downloadErrorCsv(errors)
      setResult({ read: records.length, imported, errors: errors.length })
    } catch (importError) {
      setError(importError.message || 'Non è stato possibile leggere il file XLSX.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <>
      <div className="section-heading upload-statement-heading">
        <button type="button" className="back-button" onClick={onBack}>Indietro</button>
        <h1>Carica Estratto Conto</h1>
      </div>
      <section className="chart-card upload-statement-card">
        <p>Seleziona un file XLSX:</p>
        <input ref={inputRef} className="upload-statement-input" type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={importFile} />
        <button type="button" className="upload-statement-button" onClick={() => inputRef.current?.click()} disabled={uploading}>{uploading ? 'Caricamento...' : 'Carica'}</button>
        {progress && <p className="upload-statement-progress"><span>Righe nel file: {progress.total}</span><span>Elaborate: {progress.processed}</span></p>}
        {result && <p className="upload-statement-result"><span>Caricate correttamente: {result.imported}</span>{result.errors ? <span>Errori: {result.errors} (CSV scaricato)</span> : null}</p>}
        {error && <p className="form-error">{error}</p>}
      </section>
    </>
  )
}
