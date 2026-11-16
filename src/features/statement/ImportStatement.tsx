import { useMemo, useRef, useState, type ChangeEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { FiAlertTriangle, FiCheckCircle, FiDownload, FiFileText, FiUpload } from 'react-icons/fi'
import { paths, useBack } from '../../app/navigation'
import { useUserId } from '../../data/auth'
import { useBankRecords } from '../../data/hooks'
import { commitInBatches, type BatchOperation } from '../../data/mutations'
import { userDoc } from '../../data/paths'
import { useCategoryRules } from '../../data/settings'
import {
  errorsCsv,
  importTotals,
  parseStatementSheet,
  planImport,
  type ParsedRow,
  type Row,
  type RowError,
} from '../../domain/bankImport'
import { determineNewCategory } from '../../domain/categories'
import { monthKey, toDate } from '../../domain/dates'
import { formatMonth } from '../../domain/format'
import { createBank } from '../../domain/records'
import { downloadText } from '../../lib/download'
import { Amount, Button, Card, EmptyState, ErrorState, List, ListRow, Page, SkeletonCard } from '../../ui'
import { ProgressBar } from '../../ui/charts'
import { shortDate } from '../shared/format'

interface Parsed {
  fileName: string
  parsed: ParsedRow[]
  errors: RowError[]
}

type Step =
  | { name: 'select' }
  | { name: 'reading' }
  | { name: 'preview'; data: Parsed }
  | { name: 'saving'; done: number; total: number }
  | { name: 'done'; count: number; month: string | null }

const PREVIEW_ROWS = 30

/** Legge il primo foglio del file che contiene le intestazioni dell'estratto conto. */
async function readWorkbook(file: File, rules: Parameters<typeof parseStatementSheet>[1]): Promise<Parsed> {
  const XLSX = await import('xlsx')
  const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true })
  for (const name of workbook.SheetNames) {
    const rows = XLSX.utils.sheet_to_json<Row>(workbook.Sheets[name]!, { header: 1, defval: '', raw: true })
    const result = parseStatementSheet(rows, rules)
    if (result) return { fileName: file.name, ...result }
  }
  throw new Error('Non trovo le intestazioni “Data”, “Operazione” e “Importo” in nessun foglio del file.')
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: 'negative' | 'muted' }) {
  return (
    <div className="rounded-xl bg-surface-2 px-3 py-2">
      <p className="text-[13px] text-muted">{label}</p>
      <p className={`tabular text-[22px] font-bold ${tone === 'negative' && value ? 'text-negative' : ''}`}>{value}</p>
    </div>
  )
}

/** Import dell'estratto conto XLSX: anteprima, deduplica con Firestore, salvataggio in batch. */
export default function ImportStatement() {
  const navigate = useNavigate()
  const back = useBack(paths.statement)
  const userId = useUserId()
  const bank = useBankRecords()
  const { rules } = useCategoryRules()
  const inputRef = useRef<HTMLInputElement>(null)
  const [step, setStep] = useState<Step>({ name: 'select' })
  const [error, setError] = useState('')

  const plan = useMemo(
    () => (step.name === 'preview' ? planImport(step.data.parsed, bank.data) : null),
    [step, bank.data],
  )
  const totals = useMemo(() => (plan ? importTotals(plan.toImport) : null), [plan])

  async function onFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setError('')
    setStep({ name: 'reading' })
    try {
      setStep({ name: 'preview', data: await readWorkbook(file, rules) })
    } catch (readError) {
      setError((readError as Error).message || 'Non è stato possibile leggere il file XLSX.')
      setStep({ name: 'select' })
    }
  }

  async function save() {
    if (!plan) return
    const categorize = (operation?: string | null, detail?: string | null) =>
      determineNewCategory(operation, detail, rules)
    const records = plan.toImport.map((row) => ({ ...createBank(row.record, categorize), ownerId: userId }))
    const operations: BatchOperation[] = records.map((record) => ({
      type: 'set',
      ref: userDoc(userId, 'Bank', record.uid),
      data: record as unknown as Record<string, unknown>,
    }))
    setStep({ name: 'saving', done: 0, total: operations.length })
    try {
      await commitInBatches(operations, (done, total) => setStep({ name: 'saving', done, total }))
      const latest = records
        .map((record) => toDate(record.data_valore))
        .filter(Boolean)
        .sort((a, b) => b!.getTime() - a!.getTime())[0]
      setStep({ name: 'done', count: records.length, month: latest ? monthKey(latest) : null })
    } catch (saveError) {
      console.error(saveError)
      setError(
        'Salvataggio interrotto. I movimenti già salvati non verranno duplicati: ricarica lo stesso file per completare.',
      )
      setStep({ name: 'select' })
    }
  }

  const fileInput = (
    <input
      ref={inputRef}
      type="file"
      accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      className="sr-only"
      tabIndex={-1}
      aria-hidden="true"
      onChange={onFile}
    />
  )

  return (
    <Page title="Importa" subtitle="Estratto conto della banca (XLSX)" back={{ label: 'Conto', onClick: back }}>
      {fileInput}
      {error && <ErrorState title="Import non riuscito" message={error} />}

      {step.name === 'select' && (
        <EmptyState
          icon={<FiFileText />}
          title="Scegli il file dell'estratto conto"
          message="Colonne attese: Data, Operazione, Dettagli, Conto o carta, Contabilizzazione, Categoria, Valuta, Importo. Prima di salvare vedrai un'anteprima: i movimenti già presenti non vengono importati di nuovo."
          action={
            <Button icon={<FiUpload />} onClick={() => inputRef.current?.click()}>
              Scegli file
            </Button>
          }
        />
      )}

      {step.name === 'reading' && <SkeletonCard lines={4} />}

      {step.name === 'preview' && plan && totals && (
        <>
          <Card title={step.data.fileName}>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <Stat label="Righe lette" value={step.data.parsed.length + step.data.errors.length} />
              <Stat label="Righe valide" value={step.data.parsed.length} />
              <Stat label="Già presenti" value={plan.duplicates.length} tone="muted" />
              <Stat label="Con errori" value={step.data.errors.length} tone="negative" />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3 border-t border-line pt-3">
              <div>
                <p className="text-[13px] text-muted">Entrate da importare</p>
                <Amount value={totals.income} size="md" />
              </div>
              <div>
                <p className="text-[13px] text-muted">Uscite da importare</p>
                <Amount value={Math.abs(totals.expenses)} size="md" />
              </div>
            </div>
          </Card>
          {step.data.errors.length > 0 && (
            <Card>
              <p className="flex items-center gap-2 text-[15px]">
                <FiAlertTriangle aria-hidden="true" className="text-negative" />
                {step.data.errors.length}{' '}
                {step.data.errors.length === 1 ? 'riga non verrà importata' : 'righe non verranno importate'} (data o
                importo non validi).
              </p>
              <Button
                variant="secondary"
                className="mt-3"
                icon={<FiDownload />}
                onClick={() => downloadText('errori-importazione-estratto-conto.csv', errorsCsv(step.data.errors))}
              >
                Scarica errori (CSV)
              </Button>
            </Card>
          )}
          {plan.toImport.length ? (
            <List label="Movimenti da importare">
              {plan.toImport.slice(0, PREVIEW_ROWS).map((row) => (
                <ListRow
                  key={row.index}
                  title={row.record.detail || row.record.operation || 'Movimento'}
                  subtitle={`${shortDate(row.record.data_valore)} · ${row.record.new_category}`}
                  trailing={<Amount value={row.record.amount} tone="signed" size="sm" />}
                  chevron={false}
                />
              ))}
              {plan.toImport.length > PREVIEW_ROWS && (
                <li className="px-4 py-3 text-[13px] text-muted">
                  e altri {plan.toImport.length - PREVIEW_ROWS} movimenti
                </li>
              )}
            </List>
          ) : (
            <EmptyState
              icon={<FiCheckCircle />}
              title="Niente di nuovo da importare"
              message="Tutti i movimenti validi del file sono già presenti."
            />
          )}
          <div className="flex flex-col gap-2">
            <Button block disabled={!plan.toImport.length || bank.status !== 'ready'} onClick={save}>
              {bank.status !== 'ready'
                ? 'Controllo dei movimenti esistenti…'
                : `Importa ${plan.toImport.length} ${plan.toImport.length === 1 ? 'movimento' : 'movimenti'}`}
            </Button>
            <Button variant="plain" block onClick={() => inputRef.current?.click()}>
              Scegli un altro file
            </Button>
          </div>
        </>
      )}

      {step.name === 'saving' && (
        <Card title="Salvataggio in corso">
          <ProgressBar value={step.done} max={Math.max(step.total, 1)} label="Movimenti salvati" />
          <p className="mt-2 text-[15px] text-muted" aria-live="polite">
            {step.done} di {step.total} movimenti salvati
          </p>
        </Card>
      )}

      {step.name === 'done' && (
        <EmptyState
          icon={<FiCheckCircle />}
          title={`${step.count} ${step.count === 1 ? 'movimento importato' : 'movimenti importati'}`}
          message={step.month ? `L'ultimo movimento è di ${formatMonth(step.month)}.` : undefined}
          action={
            <div className="flex flex-col gap-2">
              <Button
                onClick={() =>
                  navigate(step.month ? `${paths.statement}?mese=${step.month}&tipo=uscite` : paths.statement)
                }
              >
                Vai al conto
              </Button>
              <Button variant="plain" onClick={() => setStep({ name: 'select' })}>
                Importa un altro file
              </Button>
            </div>
          }
        />
      )}
    </Page>
  )
}
