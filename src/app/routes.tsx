import { useState, type ComponentType, type ReactNode } from 'react'
import { Navigate, useLocation, useNavigate, useParams, useSearchParams, type RouteObject } from 'react-router-dom'
import { useAuth, useUserId } from '../data/auth'
import { useBuys, useCash, useGroups, useSubscriptions } from '../data/hooks'
import type { LoadStatus } from '../data/collectionStore'
import { renewalOf } from '../domain/subscriptions'
import type { Subscription } from '../domain/types'
import AppLayout from './AppLayout'
import { Button, EmptyState, ErrorState, LoadingLabel, Skeleton, SkeletonCard } from '../ui'
import { paths, useBack } from './navigation'
import LoginScreen from '../features/auth/LoginScreen'
import TodayView from '../features/home/TodayView'
import ExpensesOverview from '../features/expenses/ExpensesOverview'
import GroupsList from '../features/expenses/GroupsList'
import GroupDetail from '../features/expenses/GroupDetail'
import StatementOverview from '../features/statement/StatementOverview'
import CategoryDetail from '../features/statement/CategoryDetail'
import MovementDetail from '../features/statement/MovementDetail'
import SavingsOverview from '../features/savings/SavingsOverview'
import CashHistory from '../features/savings/CashHistory'
import SubscriptionsList from '../features/subscriptions/SubscriptionsList'
import SettingsView from '../features/settings/SettingsView'
import CategoryRulesView from '../features/settings/CategoryRulesView'
import MoreView from '../features/more/MoreView'
import CatalogView from '../features/catalog/CatalogView'
import CashDetailViewJsx from '../features/savings/CashDetailView.jsx'
import GroupDetailViewJsx from '../features/expenses/GroupDetailView.jsx'
import BuyDetailViewJsx from '../features/expenses/BuyDetailView.jsx'
import UploadStatementViewJsx from '../features/statement/UploadStatementView.jsx'
import SubscriptionDetailViewJsx from '../features/subscriptions/SubscriptionDetailView.jsx'

/**
 * I form storici (.jsx) non sono tipizzati e usano ancora gli stili di App.css:
 * vengono sostituiti dai fogli dal basso nella Fase 5.
 */
const legacy = (component: unknown) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
const CashDetailView = legacy(CashDetailViewJsx)
const GroupDetailView = legacy(GroupDetailViewJsx)
const BuyDetailView = legacy(BuyDetailViewJsx)
const UploadStatementView = legacy(UploadStatementViewJsx)
const SubscriptionDetailView = legacy(SubscriptionDetailViewJsx)

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
function RecordState({ status, back }: { status: LoadStatus; back: string }) {
  const navigate = useNavigate()
  if (status === 'loading') return <SkeletonCard lines={3} />
  if (status === 'error') return <ErrorState />
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
  if (status === 'signedOut') {
    return <Navigate to={paths.login} replace state={{ from: `${location.pathname}${location.search}` }} />
  }
  return children
}

function LoginRoute() {
  const { status } = useAuth()
  const location = useLocation()
  if (status === 'loading') return <Loading />
  if (status === 'signedIn') {
    return <Navigate to={(location.state as { from?: string } | null)?.from ?? paths.home} replace />
  }
  return <LoginScreen />
}

// ---------- Form storici (Fase 5) ----------

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
  const [params] = useSearchParams()
  const userId = useUserId()
  const back = useBack(paths.expenses)
  const buys = useBuys()
  const groups = useGroups()
  const buy = useStable(isNew ? undefined : findById(buys.data, buyId))
  if (!isNew && !buy) return <RecordState status={buys.status} back={paths.expenses} />
  // Da un gruppo, la nuova spesa parte con quel gruppo già scelto.
  const initial = isNew && params.get('gruppo') ? { group: params.get('gruppo') } : buy
  return <BuyDetailView buy={initial} userId={userId} groupRecords={groups.data} buyRecords={buys.data} onBack={back} />
}

function StatementImportRoute() {
  const userId = useUserId()
  const back = useBack(paths.statement)
  return <UploadStatementView userId={userId} onBack={back} />
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

/** Il vecchio URL dell'andamento ora coincide con la pagina della categoria (che include il grafico). */
function TrendRedirect() {
  const { category = '' } = useParams()
  const { search } = useLocation()
  return <Navigate to={`${paths.statementCategory(category)}${search}`} replace />
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
      { index: true, element: <TodayView /> },
      { path: 'spese', element: <ExpensesOverview /> },
      { path: 'spese/gruppi', element: <GroupsList /> },
      { path: 'spese/gruppi/:groupId', element: <GroupDetail /> },
      { path: 'spese/gruppi/:groupId/modifica', element: <GroupDetailRoute /> },
      { path: 'spese/:buyId', element: <BuyDetailRoute /> },
      { path: 'conto', element: <StatementOverview /> },
      { path: 'conto/importa', element: <StatementImportRoute /> },
      { path: 'conto/categoria/:category', element: <CategoryDetail /> },
      { path: 'conto/categoria/:category/andamento', element: <TrendRedirect /> },
      { path: 'conto/movimento/:recordId', element: <MovementDetail /> },
      { path: 'altro', element: <MoreView /> },
      { path: 'altro/componenti', element: <CatalogView /> },
      { path: 'altro/risparmi', element: <SavingsOverview /> },
      { path: 'altro/risparmi/storico', element: <CashHistory /> },
      { path: 'altro/saldo/:cashId', element: <CashDetailRoute /> },
      { path: 'altro/abbonamenti', element: <SubscriptionsList /> },
      { path: 'altro/abbonamenti/:subscriptionId', element: <SubscriptionDetailRoute /> },
      { path: 'altro/abbonamenti/:subscriptionId/rinnovo', element: <SubscriptionDetailRoute mode="renew" /> },
      { path: 'altro/impostazioni', element: <SettingsView /> },
      { path: 'altro/impostazioni/categorie', element: <CategoryRulesView /> },
      { path: 'nuovo/spesa', element: <BuyDetailRoute isNew /> },
      { path: 'nuovo/saldo', element: <CashDetailRoute isNew /> },
      { path: 'nuovo/abbonamento', element: <SubscriptionDetailRoute mode="new" /> },
      { path: 'nuovo/gruppo', element: <GroupDetailRoute isNew /> },
      { path: '*', element: <Navigate to={paths.home} replace /> },
    ],
  },
]
