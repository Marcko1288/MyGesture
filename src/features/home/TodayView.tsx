import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FiArrowDownLeft, FiArrowUpRight } from 'react-icons/fi'
import { paths } from '../../app/navigation'
import { useBankRecords, useBuys, useCash, useGroups, useSubscriptions } from '../../data/hooks'
import { categoryOf, dashboardMonth, recentMovements } from '../../domain/bank'
import { monthlyExpenses, yearlyExpenses } from '../../domain/buys'
import { balanceSummary, cashDate } from '../../domain/cash'
import { monthKey } from '../../domain/dates'
import { formatDate, formatMonth } from '../../domain/format'
import { idOf } from '../../domain/numbers'
import { expiringSubscriptions } from '../../domain/subscriptions'
import {
  Amount,
  Button,
  Card,
  DataState,
  EmptyState,
  List,
  ListRow,
  Page,
  SectionTitle,
  SkeletonCard,
  SkeletonList,
} from '../../ui'
import { MiniBars, ProgressBar } from '../../ui/charts'
import { longToday, percent, relativeDays, shortDate } from '../shared/format'
import { subscriptionIcon } from '../shared/icons'

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1)

function BalanceCard() {
  const navigate = useNavigate()
  const cash = useCash()
  const summary = useMemo(() => balanceSummary(cash.data), [cash.data])
  const previousDate = summary.previous ? cashDate(summary.previous) : null
  return (
    <DataState
      status={cash.status}
      onRetry={cash.retry}
      skeleton={<SkeletonCard lines={2} />}
      isEmpty={!summary.latest}
      empty={
        <EmptyState
          title="Nessun saldo registrato"
          message="Registra il saldo del conto per vedere qui quanto hai."
          action={<Button onClick={() => navigate(paths.newCash)}>Aggiungi saldo</Button>}
        />
      }
    >
      <Card title="Saldo attuale" to={paths.savings} linkLabel="Saldo attuale: apri lo storico dei risparmi">
        <Amount value={summary.total} size="xl" />
        {summary.delta !== null && (
          <p className="mt-2 flex flex-wrap items-center gap-x-1.5 text-[15px] text-muted">
            <Amount value={summary.delta} tone="delta" size="sm" />
            <span>rispetto al {formatDate(previousDate)}</span>
          </p>
        )}
        <p className="mt-1 text-[13px] text-muted">Aggiornato al {formatDate(summary.updatedAt)}</p>
      </Card>
    </DataState>
  )
}

function MonthCard() {
  const navigate = useNavigate()
  const bank = useBankRecords()
  const month = useMemo(() => dashboardMonth(bank.data), [bank.data])
  const today = new Date()
  const spent = Math.abs(month.expenses)
  const search = `?mese=${month.month}&tipo=uscite`
  return (
    <DataState
      status={bank.status}
      onRetry={bank.retry}
      skeleton={<SkeletonCard lines={3} />}
      isEmpty={month.count === 0}
      empty={
        <EmptyState
          title="Nessun movimento recente"
          message="Importa l'estratto conto per vedere entrate e uscite del mese."
          action={<Button onClick={() => navigate(paths.statementImport)}>Importa estratto conto</Button>}
        />
      }
    >
      <Card
        title={month.isFallback ? capitalize(formatMonth(month.month)) : 'Questo mese'}
        to={`${paths.statement}${search}`}
        linkLabel={`Entrate e uscite di ${formatMonth(month.month)}: apri l'estratto conto`}
      >
        {month.isFallback && (
          <p className="mb-2 text-[13px] text-muted">
            Per {formatMonth(monthKey(today))} non hai ancora importato movimenti: ti mostro il mese precedente.
          </p>
        )}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-[13px] text-muted">Entrate</p>
            <Amount value={month.income} size="lg" />
          </div>
          <div>
            <p className="text-[13px] text-muted">Uscite</p>
            <Amount value={spent} size="lg" />
          </div>
        </div>
        <div className="mt-3">
          <ProgressBar value={spent} max={month.income} label="Uscite rispetto alle entrate" />
          <p className="mt-1.5 text-[13px] text-muted">
            {month.income === 0 ? (
              <>Nessuna entrata registrata nel mese</>
            ) : spent <= month.income ? (
              <>Hai speso il {percent(spent, month.income)} delle entrate</>
            ) : (
              <>
                Uscite superiori alle entrate di <Amount value={spent - month.income} size="sm" tone="muted" />
              </>
            )}
          </p>
        </div>
        <p className="mt-3 flex items-center justify-between border-t border-line pt-3 text-[15px]">
          <span className="text-muted">Nel salvadanaio</span>
          <Amount value={month.savings} />
        </p>
      </Card>
    </DataState>
  )
}

function YearCard() {
  const buys = useBuys()
  const groups = useGroups()
  const today = new Date()
  const status =
    buys.status === 'error' || groups.status === 'error'
      ? 'error'
      : buys.status === 'loading' || groups.status === 'loading'
        ? 'loading'
        : 'ready'
  const total = useMemo(() => yearlyExpenses(buys.data, groups.data), [buys.data, groups.data])
  const months = useMemo(() => monthlyExpenses(buys.data, groups.data), [buys.data, groups.data])
  const range =
    months.length > 1
      ? `${capitalize(formatMonth(months[0]!.month).split(' ')[0]!)} – ${formatMonth(months.at(-1)!.month)}`
      : formatMonth(months[0]!.month)
  return (
    <DataState status={status} onRetry={() => (buys.retry(), groups.retry())} skeleton={<SkeletonCard lines={2} />}>
      <Card
        title="Spese dell'anno"
        to={paths.expenses}
        linkLabel={`Spese del ${today.getFullYear()}: apri le spese per gruppo`}
      >
        <Amount value={total} size="lg" />
        <div className="mt-3">
          <MiniBars
            data={months.map((item) => ({ key: item.month, value: item.value }))}
            label={`Andamento mensile delle spese: ${months.map((item) => `${formatMonth(item.month)} ${Math.round(item.value)} euro`).join(', ')}`}
          />
        </div>
        <p className="mt-1 text-[13px] text-muted">{range}</p>
      </Card>
    </DataState>
  )
}

function ExpiringSection() {
  const subscriptions = useSubscriptions()
  const expiring = useMemo(() => expiringSubscriptions(subscriptions.data), [subscriptions.data])
  return (
    <>
      <SectionTitle
        action={
          <Link
            to={`${paths.subscriptions}?filtro=expiring`}
            className="inline-flex min-h-11 items-center text-[15px] text-accent-strong"
          >
            Tutti
          </Link>
        }
      >
        In scadenza
      </SectionTitle>
      <DataState
        status={subscriptions.status}
        onRetry={subscriptions.retry}
        skeleton={<SkeletonList rows={2} />}
        isEmpty={!expiring.length}
        empty={
          <p className="rounded-2xl bg-surface px-4 py-3 text-[15px] text-muted shadow-card">
            Nessun abbonamento in scadenza nei prossimi 30 giorni.
          </p>
        }
      >
        <List label="Abbonamenti in scadenza">
          {expiring.map(({ subscription, daysLeft }) => {
            const Icon = subscriptionIcon(subscription.name)
            return (
              <ListRow
                key={idOf(subscription)}
                to={paths.subscription(idOf(subscription))}
                icon={<Icon />}
                iconClassName={daysLeft <= 7 ? 'bg-warning/15 text-warning' : undefined}
                title={subscription.name || 'Abbonamento senza nome'}
                subtitle={`Scade ${relativeDays(daysLeft)} · ${shortDate(subscription.data_fine)}`}
                trailing={<Amount value={subscription.amount} size="sm" />}
                chevron={false}
              />
            )
          })}
        </List>
      </DataState>
    </>
  )
}

function RecentSection() {
  const bank = useBankRecords()
  const recent = useMemo(() => recentMovements(bank.data, 5), [bank.data])
  return (
    <>
      <SectionTitle
        action={
          <Link to={paths.statement} className="inline-flex min-h-11 items-center text-[15px] text-accent-strong">
            Tutti
          </Link>
        }
      >
        Ultimi movimenti
      </SectionTitle>
      <DataState
        status={bank.status}
        onRetry={bank.retry}
        skeleton={<SkeletonList rows={5} />}
        isEmpty={!recent.length}
        empty={
          <p className="rounded-2xl bg-surface px-4 py-3 text-[15px] text-muted shadow-card">
            Nessun movimento importato.
          </p>
        }
      >
        <List label="Ultimi movimenti">
          {recent.map((record) => {
            const income = Number(record.amount) >= 0
            return (
              <ListRow
                key={idOf(record)}
                to={paths.statementRecord(idOf(record))}
                icon={income ? <FiArrowDownLeft /> : <FiArrowUpRight />}
                iconClassName={income ? 'bg-positive/12 text-positive' : undefined}
                title={record.detail || record.operation || 'Movimento'}
                subtitle={`${shortDate(record.data_valore)} · ${categoryOf(record)}`}
                trailing={<Amount value={Number(record.amount) || 0} tone="signed" size="sm" />}
                chevron={false}
              />
            )
          })}
        </List>
      </DataState>
    </>
  )
}

/** Dashboard: in 3 secondi quanto ho, come va il mese, quanto ho speso, cosa scade. */
export default function TodayView() {
  return (
    <Page title="Oggi" subtitle={capitalize(longToday())}>
      <BalanceCard />
      <MonthCard />
      <YearCard />
      <ExpiringSection />
      <RecentSection />
    </Page>
  )
}
