import { useState, type ComponentType, type ReactNode } from 'react'
import { Navigate, useLocation, useNavigate, useParams, useSearchParams, type RouteObject } from 'react-router-dom'
import { useAuth, useUserId } from '../data/auth'
import { useBankRecords, useBuys, useCash, useGroups, useSubscriptions } from '../data/hooks'
import type { LoadStatus } from '../data/collectionStore'
import { renewalOf } from '../domain/subscriptions'
import type { Subscription } from '../domain/types'
import AppLayout from './AppLayout'
import { Button, EmptyState, ErrorState, LoadingLabel, Skeleton, SkeletonCard } from '../ui'
import MoreView from '../features/more/MoreView'
import CatalogView from '../features/catalog/CatalogView'
import { paths, useBack } from './navigation'
import { useTheme } from './theme'
import LoginViewJsx from '../features/auth/LoginView.jsx'
import HomeViewJsx from '../features/home/HomeView.jsx'
import SavingsViewJsx from '../features/savings/SavingsView.jsx'
import CashHistoryViewJsx from '../features/savings/CashHistoryView.jsx'
import CashDetailViewJsx from '../features/savings/CashDetailView.jsx'
import ExpensesViewJsx from '../features/expenses/ExpensesView.jsx'
import AllGroupsViewJsx from '../features/expenses/AllGroupsView.jsx'
import GroupBuysViewJsx from '../features/expenses/GroupBuysView.jsx'
import GroupDetailViewJsx from '../features/expenses/GroupDetailView.jsx'
import BuyDetailViewJsx from '../features/expenses/BuyDetailView.jsx'
import StatementViewJsx from '../features/statement/StatementView.jsx'
import StatementCategoryViewJsx from '../features/statement/StatementCategoryView.jsx'
import StatementCategoryTrendViewJsx from '../features/statement/StatementCategoryTrendView.jsx'
import StatementDetailViewJsx from '../features/statement/StatementDetailView.jsx'
import UploadStatementViewJsx from '../features/statement/UploadStatementView.jsx'
import SubscriptionsViewJsx from '../features/subscriptions/SubscriptionsView.jsx'
import SubscriptionDetailViewJsx from '../features/subscriptions/SubscriptionDetailView.jsx'
import SettingsViewJsx from '../features/settings/SettingsView.jsx'

/**
 * Le viste storiche (.jsx) non sono tipizzate: TypeScript inferirebbe tipi troppo stretti dai default
 * (es. `buyRecords = []` → never[]). Vengono riscritte in .tsx nella Fase 4.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const legacy = (component: unknown) => {
  const Legacy = component as ComponentType<any>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return function LegacyFrame(props: any) {
    return (
      <div className="home-content legacy-content">
        <Legacy {...props} />
      </div>
    )
  }
}
const LoginView = legacy(LoginViewJsx)
const HomeView = legacy(HomeViewJsx)
const SavingsView = legacy(SavingsViewJsx)
const CashHistoryView = legacy(CashHistoryViewJsx)
const CashDetailView = legacy(CashDetailViewJsx)
const ExpensesView = legacy(ExpensesViewJsx)
const AllGroupsView = legacy(AllGroupsViewJsx)
const GroupBuysView = legacy(GroupBuysViewJsx)
const GroupDetailView = legacy(GroupDetailViewJsx)
const BuyDetailView = legacy(BuyDetailViewJsx)
const StatementView = legacy(StatementViewJsx)
const StatementCategoryView = legacy(StatementCategoryViewJsx)
const StatementCategoryTrendView = legacy(StatementCategoryTrendViewJsx)
const StatementDetailView = legacy(StatementDetailViewJsx)
const UploadStatementView = legacy(UploadStatementViewJsx)
const SubscriptionsView = legacy(SubscriptionsViewJsx)
const SubscriptionDetailView = legacy(SubscriptionDetailViewJsx)
const SettingsView = legacy(SettingsViewJsx)

type Identified = { uid?: string; id?: string }
const idOf = (record: Identified) => record.uid ?? record.id ?? ''
const findById = <T extends Identified>(records: T[], id: string | undefined) =>
  records.find((record) => idOf(record) === id || record.id === id)

/**
 * Tiene il primo valore trovato: i form storici reimpostano la bozza quando cambia l'oggetto,
 * e con onSnapshot l'oggetto cambia a ogni aggiornamento della collezione.
 */
function useStable<T>(value: T | undefined): T | undefined {
  const [stable, setStable] = useState(value)
  if (stable === undefined && value !== undefined) setStable(value)
  return stable ?? value
}

function Loading() {
  return (
    <div className="grid min-h-dvh place-items-center bg-bg px-6">
      <LoadingLabel>Avvio di My Gesture…</LoadingLabel>
      <div aria-hidden="true" className="flex flex-col items-center gap-3">
        <div className="size-16 rounded-2xl bg-accent motion-safe:animate-pulse" />
        <Skeleton className="h-3 w-24" />
      </div>
    </div>
  )
}

/** Stato di una schermata di dettaglio: caricamento, errore o elemento non trovato. */
function RecordState({ status, back, onRetry }: { status: LoadStatus; back: string; onRetry?: () => void }) {
  const navigate = useNavigate()
  if (status === 'loading') return <SkeletonCard lines={3} />
  if (status === 'error') return <ErrorState onRetry={onRetry} />
  return (
    <EmptyState
      title="Elemento non trovato"
      message="Potrebbe essere stato eliminato, anche da un altro dispositivo."
      action={<Button onClick={() => navigate(back, { replace: true })}>Torna indietro</Button>}
    />
  )
}

// ---------- Accesso ----------

function RequireAuth({ children }: { children: ReactNode }) {
  const { status } = useAuth()
  const location = useLocation()
  if (status === 'loading') return <Loading />
  if (status === 'signedOut')
    return <Navigate to={paths.login} replace state={{ from: `${location.pathname}${location.search}` }} />
  return children
}

function LoginRoute() {
  const { status } = useAuth()
  const location = useLocation()
  if (status === 'loading') return <Loading />
  if (status === 'signedIn')
    return <Navigate to={(location.state as { from?: string } | null)?.from ?? paths.home} replace />
  return <LoginView />
}

// ---------- Home ----------

function HomeRoute() {
  const navigate = useNavigate()
  const cash = useCash()
  const buys = useBuys()
  const groups = useGroups()
  const bank = useBankRecords()
  const subscriptions = useSubscriptions()
  return (
    <HomeView
      latestCash={cash.data[0]}
      previousCash={cash.data[1]}
      cashError={cash.status === 'error'}
      buyRecords={buys.data}
      groupRecords={groups.data}
      bankRecords={bank.data}
      subscriptionRecords={subscriptions.data}
      buyError={buys.status === 'error' || groups.status === 'error'}
      onSelectCash={(record: Identified) => navigate(paths.cash(idOf(record)))}
      onOpenExpenses={() => navigate(paths.expenses)}
      onOpenStatement={() => navigate(paths.statement)}
      onOpenSubscriptions={() => navigate(`${paths.subscriptions}?filtro=expiring`)}
    />
  )
}

// ---------- Risparmi ----------

function SavingsRoute() {
  const navigate = useNavigate()
  const cash = useCash()
  return (
    <SavingsView
      cashRecords={cash.data}
      onSelectCash={(record: Identified) => navigate(paths.cash(idOf(record)))}
      showHistory={false}
      onShowHistoryChange={(show: boolean) => show && navigate(paths.cashHistory)}
    />
  )
}

function CashHistoryRoute() {
  const navigate = useNavigate()
  const back = useBack(paths.savings)
  const cash = useCash()
  return (
    <CashHistoryView
      cashRecords={cash.data}
      onBack={back}
      onSelectCash={(record: Identified) => navigate(paths.cash(idOf(record)))}
    />
  )
}

function CashDetailRoute({ isNew = false }: { isNew?: boolean }) {
  const { cashId } = useParams()
  const userId = useUserId()
  const back = useBack(paths.savings)
  const cash = useCash()
  const buys = useBuys()
  const groups = useGroups()
  const record = useStable(isNew ? undefined : findById(cash.data, cashId))
  if (!isNew && !record) return <RecordState status={cash.status} back={paths.savings} />
  return (
    <CashDetailView
      cash={record ?? null}
      userId={userId}
      buyRecords={buys.data}
      groupRecords={groups.data}
      onBack={back}
    />
  )
}

// ---------- Spese ----------

function ExpensesRoute() {
  const navigate = useNavigate()
  const buys = useBuys()
  const groups = useGroups()
  return (
    <ExpensesView
      buyRecords={buys.data}
      groupRecords={groups.data}
      error={buys.status === 'error' || groups.status === 'error'}
      onSelectGroup={(groupId: string) => navigate(paths.group(groupId))}
      onShowAllGroups={() => navigate(paths.groups)}
    />
  )
}

function AllGroupsRoute() {
  const navigate = useNavigate()
  const userId = useUserId()
  const back = useBack(paths.expenses)
  const buys = useBuys()
  const groups = useGroups()
  return (
    <AllGroupsView
      groupRecords={groups.data}
      buyRecords={buys.data}
      userId={userId}
      onBack={back}
      onSelectGroup={(group: Identified) => navigate(paths.group(idOf(group)))}
    />
  )
}

function GroupBuysRoute() {
  const { groupId } = useParams()
  const navigate = useNavigate()
  const back = useBack(paths.expenses)
  const buys = useBuys()
  const groups = useGroups()
  const group = findById(groups.data, groupId)
  if (!group) return <RecordState status={groups.status} back={paths.expenses} />
  return (
    <GroupBuysView
      group={group}
      buyRecords={buys.data}
      onBack={back}
      onSelectBuy={(buy: Identified) => navigate(paths.buy(idOf(buy)))}
      onEditGroup={() => navigate(paths.editGroup(idOf(group)))}
    />
  )
}

function GroupDetailRoute({ isNew = false }: { isNew?: boolean }) {
  const { groupId } = useParams()
  const navigate = useNavigate()
  const userId = useUserId()
  const back = useBack(isNew ? paths.expenses : paths.group(groupId ?? ''))
  const buys = useBuys()
  const groups = useGroups()
  const group = useStable(isNew ? undefined : findById(groups.data, groupId))
  if (!isNew && !group) return <RecordState status={groups.status} back={paths.expenses} />
  return (
    <GroupDetailView
      group={group}
      userId={userId}
      buyRecords={buys.data}
      onBack={back}
      onDeleted={() => navigate(paths.expenses, { replace: true })}
    />
  )
}

function BuyDetailRoute({ isNew = false }: { isNew?: boolean }) {
  const { buyId } = useParams()
  const userId = useUserId()
  const back = useBack(paths.expenses)
  const buys = useBuys()
  const groups = useGroups()
  const buy = useStable(isNew ? undefined : findById(buys.data, buyId))
  if (!isNew && !buy) return <RecordState status={buys.status} back={paths.expenses} />
  return <BuyDetailView buy={buy} userId={userId} groupRecords={groups.data} buyRecords={buys.data} onBack={back} />
}

// ---------- Estratto conto ----------

const filterToParam: Record<string, string> = { incoming: 'entrate', outgoing: 'uscite', all: 'tutto' }
const paramToFilter: Record<string, string> = { entrate: 'incoming', uscite: 'outgoing', tutto: 'all' }

function useStatementParams() {
  const [params, setParams] = useSearchParams()
  const month = params.get('mese') ?? ''
  const filter = paramToFilter[params.get('tipo') ?? ''] ?? ''
  const query = (next: { month?: string; filter?: string }) => {
    const search = new URLSearchParams()
    if (next.month) search.set('mese', next.month)
    if (next.filter) search.set('tipo', filterToParam[next.filter] ?? next.filter)
    return search.toString()
  }
  return { month, filter, query, setParams }
}

function StatementRoute() {
  const navigate = useNavigate()
  const bank = useBankRecords()
  const { month, filter, query, setParams } = useStatementParams()
  return (
    <StatementView
      bankRecords={bank.data}
      month={month}
      filter={filter}
      onChangeParams={(next: { month: string; filter: string }) => setParams(query(next), { replace: true })}
      onSelectCategory={(category: string, selectedMonth: string, selectedFilter: string) =>
        navigate(`${paths.statementCategory(category)}?${query({ month: selectedMonth, filter: selectedFilter })}`)
      }
    />
  )
}

/** Mese precedente in formato `YYYY-MM` (default storico dell'estratto conto). */
function previousMonthValue(today = new Date()) {
  const date = new Date(today.getFullYear(), today.getMonth() - 1, 1)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function useCategoryRouteProps() {
  const { category = '' } = useParams()
  const navigate = useNavigate()
  const { month, filter, query } = useStatementParams()
  const selectedMonth = month || previousMonthValue()
  const selectedFilter = filter || 'outgoing'
  return {
    category,
    selectedMonth,
    filter: selectedFilter,
    search: query({ month: selectedMonth, filter: selectedFilter }),
    onSelectRecord: (record: Identified) => navigate(paths.statementRecord(idOf(record))),
  }
}

function StatementCategoryRoute() {
  const navigate = useNavigate()
  const bank = useBankRecords()
  const { search, ...props } = useCategoryRouteProps()
  const back = useBack(`${paths.statement}?${search}`)
  return (
    <StatementCategoryView
      {...props}
      bankRecords={bank.data}
      onBack={back}
      onOpenTrend={() => navigate(`${paths.statementTrend(props.category)}?${search}`)}
    />
  )
}

function StatementTrendRoute() {
  const bank = useBankRecords()
  const { search, ...props } = useCategoryRouteProps()
  const back = useBack(`${paths.statementCategory(props.category)}?${search}`)
  return <StatementCategoryTrendView {...props} bankRecords={bank.data} onBack={back} />
}

function StatementRecordRoute() {
  const { recordId } = useParams()
  const back = useBack(paths.statement)
  const bank = useBankRecords()
  const record = findById(bank.data, recordId)
  if (!record) return <RecordState status={bank.status} back={paths.statement} />
  return <StatementDetailView record={record} onBack={back} />
}

function StatementImportRoute() {
  const userId = useUserId()
  const back = useBack(paths.statement)
  return <UploadStatementView userId={userId} onBack={back} />
}

// ---------- Abbonamenti ----------

const subscriptionFilters = ['all', 'past', 'active', 'expiring']

function SubscriptionsRoute() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const subscriptions = useSubscriptions()
  const filter = subscriptionFilters.includes(params.get('filtro') ?? '') ? params.get('filtro')! : 'active'
  return (
    <SubscriptionsView
      subscriptionRecords={subscriptions.data}
      filter={filter}
      onFilterChange={(value: string) => setParams(value === 'active' ? {} : { filtro: value }, { replace: true })}
      onSelectSubscription={(subscription: Identified) => navigate(paths.subscription(idOf(subscription)))}
    />
  )
}

function SubscriptionDetailRoute({ mode = 'edit' }: { mode?: 'new' | 'edit' | 'renew' }) {
  const { subscriptionId } = useParams()
  const navigate = useNavigate()
  const userId = useUserId()
  const back = useBack(mode === 'renew' ? paths.subscription(subscriptionId ?? '') : paths.subscriptions)
  const subscriptions = useSubscriptions()
  const record = useStable(mode === 'new' ? undefined : findById(subscriptions.data, subscriptionId))
  if (mode !== 'new' && !record) return <RecordState status={subscriptions.status} back={paths.subscriptions} />
  const subscription = mode === 'renew' && record ? (renewalOf(record as Subscription) ?? undefined) : record
  return (
    <SubscriptionDetailView
      key={mode}
      subscription={subscription}
      userId={userId}
      onBack={mode === 'renew' ? () => navigate(paths.subscriptions, { replace: true }) : back}
      onRenew={() => record && navigate(paths.renewSubscription(idOf(record)))}
    />
  )
}

// ---------- Impostazioni ----------

function SettingsRoute() {
  const userId = useUserId()
  const { theme, setTheme, color, setColor } = useTheme()
  return <SettingsView theme={theme} setTheme={setTheme} color={color} setColor={setColor} userId={userId} />
}

export const routes: RouteObject[] = [
  { path: paths.login, element: <LoginRoute /> },
  {
    element: (
      <RequireAuth>
        <AppLayout />
      </RequireAuth>
    ),
    children: [
      { index: true, element: <HomeRoute /> },
      { path: 'spese', element: <ExpensesRoute /> },
      { path: 'spese/gruppi', element: <AllGroupsRoute /> },
      { path: 'spese/gruppi/:groupId', element: <GroupBuysRoute /> },
      { path: 'spese/gruppi/:groupId/modifica', element: <GroupDetailRoute /> },
      { path: 'spese/:buyId', element: <BuyDetailRoute /> },
      { path: 'conto', element: <StatementRoute /> },
      { path: 'conto/importa', element: <StatementImportRoute /> },
      { path: 'conto/categoria/:category', element: <StatementCategoryRoute /> },
      { path: 'conto/categoria/:category/andamento', element: <StatementTrendRoute /> },
      { path: 'conto/movimento/:recordId', element: <StatementRecordRoute /> },
      { path: 'altro', element: <MoreView /> },
      { path: 'altro/componenti', element: <CatalogView /> },
      { path: 'altro/risparmi', element: <SavingsRoute /> },
      { path: 'altro/risparmi/storico', element: <CashHistoryRoute /> },
      { path: 'altro/saldo/:cashId', element: <CashDetailRoute /> },
      { path: 'altro/abbonamenti', element: <SubscriptionsRoute /> },
      { path: 'altro/abbonamenti/:subscriptionId', element: <SubscriptionDetailRoute /> },
      { path: 'altro/abbonamenti/:subscriptionId/rinnovo', element: <SubscriptionDetailRoute mode="renew" /> },
      { path: 'altro/impostazioni', element: <SettingsRoute /> },
      { path: 'nuovo/spesa', element: <BuyDetailRoute isNew /> },
      { path: 'nuovo/saldo', element: <CashDetailRoute isNew /> },
      { path: 'nuovo/abbonamento', element: <SubscriptionDetailRoute mode="new" /> },
      { path: 'nuovo/gruppo', element: <GroupDetailRoute isNew /> },
      { path: '*', element: <Navigate to={paths.home} replace /> },
    ],
  },
]
