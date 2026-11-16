import { useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { FiClock, FiPlus } from 'react-icons/fi'
import { paths, useBack } from '../../app/navigation'
import { useCash } from '../../data/hooks'
import { balanceSummary, periodBalances, periodDeltas, type BalancePeriod } from '../../domain/cash'
import { formatDate } from '../../domain/format'
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
  SectionTitle,
  SegmentedControl,
  SkeletonCard,
} from '../../ui'
import { Bars } from '../../ui/charts'

const LIMITS: Record<BalancePeriod, number> = { monthly: 6, yearly: 4 }

/** "Quanto ho messo da parte nel tempo?" Saldo di fine periodo e variazioni. */
export default function SavingsOverview() {
  const navigate = useNavigate()
  const back = useBack(paths.more)
  const [params, setParams] = useSearchParams()
  const period: BalancePeriod = params.get('periodo') === 'anno' ? 'yearly' : 'monthly'
  const cash = useCash()
  const summary = useMemo(() => balanceSummary(cash.data), [cash.data])
  const balances = useMemo(() => periodBalances(cash.data, period, LIMITS[period]), [cash.data, period])
  // Una variazione in più del grafico: serve il periodo precedente al primo mostrato.
  const deltas = useMemo(
    () => periodDeltas(periodBalances(cash.data, period, LIMITS[period] + 1)).reverse(),
    [cash.data, period],
  )
  const unit = period === 'monthly' ? 'mese' : 'anno'

  return (
    <Page
      title="Risparmi"
      subtitle="Saldo del conto nel tempo"
      back={{ label: 'Altro', onClick: back }}
      actions={<IconButton label="Nuovo saldo" icon={<FiPlus />} onClick={() => navigate(paths.newCash)} />}
    >
      <DataState
        status={cash.status}
        onRetry={cash.retry}
        skeleton={
          <>
            <SkeletonCard lines={2} />
            <SkeletonCard lines={4} />
          </>
        }
        isEmpty={!summary.latest}
        empty={
          <EmptyState
            title="Nessun saldo registrato"
            message="Registra il saldo periodicamente per vedere come crescono i risparmi."
            action={<Button onClick={() => navigate(paths.newCash)}>Aggiungi saldo</Button>}
          />
        }
      >
        <Card title="Saldo attuale">
          <Amount value={summary.total} size="xl" />
          {summary.delta !== null && (
            <p className="mt-2 flex items-center gap-1.5 text-[15px] text-muted">
              <Amount value={summary.delta} tone="delta" size="sm" /> rispetto al saldo precedente
            </p>
          )}
          <p className="mt-1 text-[13px] text-muted">Aggiornato al {formatDate(summary.updatedAt)}</p>
        </Card>
        <SegmentedControl<BalancePeriod>
          label="Periodo del grafico"
          value={period}
          onChange={(value) => setParams(value === 'yearly' ? { periodo: 'anno' } : {}, { replace: true })}
          options={[
            { value: 'monthly', label: 'Mensile' },
            { value: 'yearly', label: 'Annuale' },
          ]}
        />
        <Card title={`Saldo a fine ${unit}`}>
          <Bars
            label={`Saldo a fine ${unit}: ${balances.map((item) => `${item.label} ${Math.round(item.value)} euro`).join(', ')}`}
            data={balances.map((item) => ({ key: item.key, label: item.label, value: item.value }))}
          />
          <p className="mt-1 text-[13px] text-muted">Ultimo saldo registrato in ogni {unit}</p>
        </Card>
        {deltas.length > 0 && (
          <>
            <SectionTitle>Variazioni</SectionTitle>
            <List label={`Variazione rispetto al ${unit} precedente`}>
              {deltas.map((item) => (
                <ListRow
                  key={item.key}
                  title={item.label}
                  trailing={<Amount value={item.value} tone="delta" size="sm" />}
                  chevron={false}
                />
              ))}
            </List>
          </>
        )}
        <List label="Storico">
          <ListRow
            to={paths.cashHistory}
            icon={<FiClock />}
            title="Storico completo"
            subtitle={`${cash.data.length} saldi registrati`}
          />
        </List>
      </DataState>
    </Page>
  )
}
