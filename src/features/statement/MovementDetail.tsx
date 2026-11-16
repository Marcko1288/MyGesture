import { Link, useNavigate, useParams } from 'react-router-dom'
import { paths, useBack } from '../../app/navigation'
import { useBankRecords } from '../../data/hooks'
import { categoryOf } from '../../domain/bank'
import { monthKey, toDate } from '../../domain/dates'
import { formatDate } from '../../domain/format'
import { idOf } from '../../domain/numbers'
import { Amount, Button, Card, DataState, EmptyState, List, ListRow, Page, SkeletonCard } from '../../ui'

/** Dettaglio di un movimento dell'estratto conto. */
export default function MovementDetail() {
  const { recordId = '' } = useParams()
  const navigate = useNavigate()
  const back = useBack(paths.statement)
  const bank = useBankRecords()
  const record = bank.data.find((item) => idOf(item) === recordId || item.id === recordId)
  const amount = Number(record?.amount) || 0
  const date = toDate(record?.data_valore)
  const category = record ? categoryOf(record) : ''
  const fields: [string, string | undefined][] = record
    ? [
        ['Operazione', record.operation],
        ['Dettagli', record.detail],
        ['Conto o carta', record.card],
        ['Contabilizzazione', record.accounting],
        ['Categoria della banca', record.category],
        ['Valuta', record.currency],
      ]
    : []

  return (
    <Page title="Movimento" back={{ label: 'Indietro', onClick: back }}>
      <DataState
        status={bank.status}
        onRetry={bank.retry}
        skeleton={<SkeletonCard lines={3} />}
        isEmpty={!record}
        empty={
          <EmptyState
            title="Movimento non trovato"
            message="Potrebbe essere stato eliminato."
            action={<Button onClick={() => navigate(paths.statement, { replace: true })}>Vai al conto</Button>}
          />
        }
      >
        <Card>
          <p className="text-[15px] font-semibold text-muted">{amount >= 0 ? 'Entrata' : 'Uscita'}</p>
          <Amount value={amount} size="xl" tone="signed" currency={record?.currency || 'EUR'} />
          <p className="mt-2 text-[15px] text-muted">{formatDate(record?.data_valore) ?? 'Data non disponibile'}</p>
          {date && (
            <Link
              to={`${paths.statementCategory(category)}?mese=${monthKey(date)}&tipo=${amount >= 0 ? 'entrate' : 'uscite'}`}
              className="mt-3 inline-flex min-h-11 items-center rounded-full bg-accent-soft px-4 text-[15px] font-semibold text-accent-strong"
            >
              {category}
            </Link>
          )}
        </Card>
        <List label="Dati del movimento">
          {fields.map(([label, value]) => (
            <ListRow
              key={label}
              title={<span className="text-[13px] text-muted">{label}</span>}
              subtitle={<span className="text-[17px] whitespace-normal text-fg">{value || '—'}</span>}
              chevron={false}
            />
          ))}
        </List>
      </DataState>
    </Page>
  )
}
