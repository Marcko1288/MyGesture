import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { FiChevronLeft, FiChevronRight, FiDownload, FiUpload } from 'react-icons/fi'
import { paths } from '../../app/navigation'
import { useBankRecords } from '../../data/hooks'
import { useCategoryRules } from '../../data/settings'
import { categoryColorOrder, firstMonthWithData, statementBreakdown, type Direction } from '../../domain/bank'
import { statementCsv } from '../../domain/csv'
import { addMonths, monthKey } from '../../domain/dates'
import { formatMonth } from '../../domain/format'
import { downloadText } from '../../lib/download'
import {
  Amount,
  Button,
  Card,
  DataState,
  EmptyState,
  IconButton,
  List,
  ListRow,
  Page,
  SegmentedControl,
  SkeletonCard,
  SkeletonList,
} from '../../ui'
import { Donut, LegendDot, seriesColor } from '../../ui/charts'
import { percent } from '../shared/format'
import { directionLabels, useStatementParams } from './params'

const totalLabels: Record<Direction, string> = {
  outgoing: 'Totale uscite',
  incoming: 'Totale entrate',
  all: 'Saldo del mese',
}

/** Colori stabili delle categorie (seguono la categoria, non la sua posizione nel mese). */
export function useCategoryColors() {
  const bank = useBankRecords()
  const { rules } = useCategoryRules()
  return useMemo(() => {
    const order = categoryColorOrder(
      bank.data,
      rules.map((rule) => rule.category),
    )
    return (category: string) => seriesColor(order.indexOf(category))
  }, [bank.data, rules])
}

/** "Dove sono andati i soldi questo mese?" */
export default function StatementOverview() {
  const navigate = useNavigate()
  const bank = useBankRecords()
  const { month, direction, search, update } = useStatementParams()
  const colorOf = useCategoryColors()
  const breakdown = useMemo(() => statementBreakdown(bank.data, month, direction), [bank.data, month, direction])
  const current = monthKey(new Date())
  const first = useMemo(() => firstMonthWithData(bank.data) ?? addMonths(current, -6), [bank.data, current])
  const categories = [...breakdown.categories].sort((a, b) => b.value - a.value)
  const absoluteTotal = categories.reduce((sum, item) => sum + item.value, 0)

  return (
    <Page
      title="Conto"
      subtitle="Estratto conto per categoria"
      actions={
        <>
          <IconButton
            label="Scarica CSV del mese"
            icon={<FiDownload />}
            disabled={!breakdown.records.length}
            onClick={() => downloadText(`estratto-conto-${month}-${direction}.csv`, statementCsv(breakdown.records))}
          />
          <IconButton
            label="Importa estratto conto"
            icon={<FiUpload />}
            onClick={() => navigate(paths.statementImport)}
          />
        </>
      }
    >
      <div className="flex items-center justify-between rounded-2xl bg-surface px-1 shadow-card">
        <IconButton
          label="Mese precedente"
          icon={<FiChevronLeft />}
          disabled={month <= first}
          onClick={() => update({ month: addMonths(month, -1) })}
        />
        <h2 className="text-[17px] font-semibold capitalize" aria-live="polite">
          {formatMonth(month)}
        </h2>
        <IconButton
          label="Mese successivo"
          icon={<FiChevronRight />}
          disabled={month >= current}
          onClick={() => update({ month: addMonths(month, 1) })}
        />
      </div>
      <SegmentedControl<Direction>
        label="Tipo di movimento"
        value={direction}
        onChange={(value) => update({ direction: value })}
        options={(['outgoing', 'incoming', 'all'] as Direction[]).map((value) => ({
          value,
          label: directionLabels[value],
        }))}
      />
      <DataState
        status={bank.status}
        onRetry={bank.retry}
        skeleton={
          <>
            <SkeletonCard />
            <SkeletonList rows={4} />
          </>
        }
        isEmpty={!breakdown.records.length}
        empty={
          <EmptyState
            title={`Nessun movimento a ${formatMonth(month)}`}
            message={
              direction === 'all'
                ? "Importa l'estratto conto del mese per vederlo qui."
                : `Nessuna ${direction === 'outgoing' ? 'uscita' : 'entrata'} in questo mese.`
            }
            action={<Button onClick={() => navigate(paths.statementImport)}>Importa estratto conto</Button>}
          />
        }
      >
        <Card>
          <div className="flex items-center gap-4">
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-semibold text-muted">{totalLabels[direction]}</p>
              <Amount value={breakdown.total} size="lg" tone={direction === 'all' ? 'delta' : 'plain'} />
              <p className="mt-1 text-[13px] text-muted">
                {breakdown.records.length} {breakdown.records.length === 1 ? 'movimento' : 'movimenti'}
              </p>
            </div>
            <Donut
              size={112}
              data={categories.map((item) => ({ key: item.name, value: item.value, color: colorOf(item.name) }))}
            />
          </div>
        </Card>
        <List label="Categorie del mese">
          {categories.map((item) => (
            <ListRow
              key={item.name}
              to={`${paths.statementCategory(item.name)}?${search()}`}
              title={
                <span className="flex items-center gap-2">
                  <LegendDot color={colorOf(item.name)} />
                  <span className="truncate">{item.name}</span>
                </span>
              }
              subtitle={percent(item.value, absoluteTotal)}
              trailing={<Amount value={item.value} size="sm" />}
            />
          ))}
        </List>
      </DataState>
    </Page>
  )
}
