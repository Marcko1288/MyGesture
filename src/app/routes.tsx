import type { ReactNode } from 'react'
import { Navigate, useLocation, useParams, type RouteObject } from 'react-router-dom'
import { useAuth } from '../data/auth'
import AppLayout from './AppLayout'
import { LoadingLabel, Skeleton } from '../ui'
import { paths, sheetHref, type SheetKind } from './navigation'
import ImportStatement from '../features/statement/ImportStatement'
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

// ---------- Vecchi URL dei form → pagina con il foglio aperto ----------

/** Reindirizza un vecchio URL di dettaglio/creazione alla pagina corrispondente con `?foglio=…`. */
function SheetRedirect({ to, kind, param }: { to: string; kind: SheetKind; param?: string }) {
  const params = useParams()
  const { search } = useLocation()
  const extra = Object.fromEntries(new URLSearchParams(search))
  return <Navigate to={sheetHref(to, '', kind, param ? params[param] : undefined, extra)} replace />
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
      { path: 'conto', element: <StatementOverview /> },
      { path: 'conto/importa', element: <ImportStatement /> },
      { path: 'conto/categoria/:category', element: <CategoryDetail /> },
      { path: 'conto/categoria/:category/andamento', element: <TrendRedirect /> },
      { path: 'conto/movimento/:recordId', element: <MovementDetail /> },
      { path: 'altro', element: <MoreView /> },
      { path: 'altro/componenti', element: <CatalogView /> },
      { path: 'altro/risparmi', element: <SavingsOverview /> },
      { path: 'altro/risparmi/storico', element: <CashHistory /> },
      { path: 'altro/abbonamenti', element: <SubscriptionsList /> },
      { path: 'altro/impostazioni', element: <SettingsView /> },
      { path: 'altro/impostazioni/categorie', element: <CategoryRulesView /> },
      // Vecchi URL (Fasi 1–4): i dettagli e i "nuovo" ora sono fogli sopra la pagina.
      {
        path: 'spese/gruppi/:groupId/modifica',
        element: <SheetRedirect to={paths.groups} kind="gruppo" param="groupId" />,
      },
      { path: 'spese/:buyId', element: <SheetRedirect to={paths.expenses} kind="spesa" param="buyId" /> },
      { path: 'altro/saldo/:cashId', element: <SheetRedirect to={paths.cashHistory} kind="saldo" param="cashId" /> },
      {
        path: 'altro/abbonamenti/:subscriptionId',
        element: <SheetRedirect to={paths.subscriptions} kind="abbonamento" param="subscriptionId" />,
      },
      {
        path: 'altro/abbonamenti/:subscriptionId/rinnovo',
        element: <SheetRedirect to={paths.subscriptions} kind="rinnovo" param="subscriptionId" />,
      },
      { path: 'nuovo/spesa', element: <SheetRedirect to={paths.expenses} kind="spesa" /> },
      { path: 'nuovo/saldo', element: <SheetRedirect to={paths.savings} kind="saldo" /> },
      { path: 'nuovo/abbonamento', element: <SheetRedirect to={paths.subscriptions} kind="abbonamento" /> },
      { path: 'nuovo/gruppo', element: <SheetRedirect to={paths.groups} kind="gruppo" /> },
      { path: '*', element: <Navigate to={paths.home} replace /> },
    ],
  },
]
