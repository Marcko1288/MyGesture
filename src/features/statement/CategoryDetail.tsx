import { useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { paths, useBack } from '../../app/navigation'
import { useBankRecords } from '../../data/hooks'
import { categoryRecords, categoryTrend } from '../../domain/bank'
import { formatMonth, formatShortMonth } from '../../domain/format'
import { idOf } from '../../domain/numbers'
import { Amount, Card, DataState, EmptyState, List, ListRow, Page, SkeletonCard, SkeletonList } from '../../ui'
import { Bars } from '../../ui/charts'
import { shortDate } from '../shared/format'
import { directionLabels, useStatementParams } from './params'

/** Movimenti di una categoria nel mese, con l'andamento degli ultimi 4 mesi (tocca una barra per cambiare mese). */
export default function CategoryDetail() {
  const { category = '' } = useParams()
  const bank = useBankRecords()
  const { month, direction, search, update } = useStatementParams()
  const back = useBack(`${paths.statement}?${search()}`)
  const records = useMemo(
    () => categoryRecords(bank.data, category, month, direction),
    [bank.data, category, month, direction],
  )
  const trend = useMemo(
    () => categoryTrend(bank.data, category, month, direction),
    [bank.data, category, month, direction],
  )
  const total = records.reduce((sum, record) => sum + Math.abs(Number(record.amount) || 0), 0)

  return (
    <Page
      title={category}
      subtitle={`${formatMonth(month)} · ${directionLabels[direction]}`}
      back={{ label: 'Conto', onClick: back }}
    >
      <DataState
        status={bank.status}
        onRetry={bank.retry}
        skeleton={
          <>
            <SkeletonCard />
            <SkeletonList rows={4} />
          </>
        }
      >
        <Card>
          <p className="text-[15px] font-semibold text-muted">Totale del mese</p>
          <Amount value={total} size="lg" />
          <div className="mt-3">
            <Bars
              height={150}
              label={`Andamento di ${category}: ${trend.map((item) => `${formatMonth(item.month)} ${Math.round(item.value)} euro`).join(', ')}`}
              data={trend.map((item) => ({ key: item.month, label: formatShortMonth(item.month), value: item.value }))}
              selectedKey={month}
              onSelect={(key) => update({ month: key })}
            />
          </div>
          <p className="mt-1 text-[13px] text-muted">Ultimi 4 mesi · tocca una barra per vedere quel mese</p>
        </Card>
        {records.length ? (
          <List label={`Movimenti di ${category}`}>
            {records.map((record) => (
              <ListRow
                key={idOf(record)}
                to={paths.statementRecord(idOf(record))}
                title={record.detail || record.operation || 'Movimento'}
                subtitle={`${shortDate(record.data_valore)} · ${record.operation}`}
                trailing={<Amount value={Number(record.amount) || 0} tone="signed" size="sm" />}
                chevron={false}
              />
            ))}
          </List>
        ) : (
          <EmptyState title={`Nessun movimento a ${formatMonth(month)}`} message="Scegli un altro mese dal grafico." />
        )}
      </DataState>
    </Page>
  )
}
