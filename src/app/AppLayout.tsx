import { Suspense, useEffect, useState, type ReactNode } from 'react'
import { Outlet, ScrollRestoration, useLocation, useNavigate } from 'react-router-dom'
import { FiBell, FiDollarSign, FiLayers, FiShoppingBag, FiUpload } from 'react-icons/fi'
import { useAuth } from '../data/auth'
import { listenForegroundMessages, syncPushToken } from '../data/push'
import {
  BottomSheet,
  List,
  ListRow,
  LoadingLabel,
  OfflineBanner,
  SkeletonCard,
  SkeletonList,
  TabBar,
  useToast,
} from '../ui'
import FormSheetHost from '../features/forms/FormSheetHost'
import { paths, useSheet, type SheetKind } from './navigation'

const quickActions: { label: string; description: string; icon: ReactNode; sheet?: SheetKind; to?: string }[] = [
  { label: 'Spesa', description: 'Aggiungi una spesa a un gruppo', icon: <FiShoppingBag />, sheet: 'spesa' },
  { label: 'Saldo', description: 'Aggiorna il saldo del conto', icon: <FiDollarSign />, sheet: 'saldo' },
  { label: 'Abbonamento', description: 'Nuovo abbonamento o servizio', icon: <FiBell />, sheet: 'abbonamento' },
  {
    label: 'Importa estratto conto',
    description: 'File XLSX della banca',
    icon: <FiUpload />,
    to: paths.statementImport,
  },
  { label: 'Gruppo', description: 'Nuovo gruppo di spese', icon: <FiLayers />, sheet: 'gruppo' },
]

/** Shell dell'app: contenuto della schermata, banner offline e tab bar con l'azione rapida "Aggiungi". */
export default function AppLayout() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [addOpen, setAddOpen] = useState(false)
  const sheet = useSheet()
  const toast = useToast()
  const userId = user?.uid

  useEffect(() => setAddOpen(false), [pathname])

  useEffect(() => {
    if (!userId) return
    // Rinnova il token push a ogni avvio e quando l'app torna in primo piano.
    syncPushToken(userId, { force: true })
    const onVisible = () => {
      if (document.visibilityState === 'visible') syncPushToken(userId)
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [userId])

  useEffect(
    () =>
      listenForegroundMessages((title, body) =>
        toast({ message: body ? `${title}: ${body}` : title, tone: 'info', duration: 8000 }),
      ),
    [toast],
  )

  return (
    <div className="min-h-dvh bg-bg">
      <main
        className="mx-auto w-full max-w-2xl px-4"
        style={{
          paddingTop: 'calc(var(--safe-top) + 8px)',
          paddingBottom: 'calc(var(--tabbar-height) + var(--safe-bottom) + 24px)',
          paddingLeft: 'max(16px, var(--safe-left))',
          paddingRight: 'max(16px, var(--safe-right))',
        }}
      >
        <OfflineBanner />
        <Suspense
          fallback={
            <div className="flex flex-col gap-3 pt-16">
              <LoadingLabel />
              <SkeletonCard />
              <SkeletonList rows={4} />
            </div>
          }
        >
          <Outlet />
        </Suspense>
      </main>
      <TabBar onAdd={() => setAddOpen(true)} addOpen={addOpen} />
      <BottomSheet open={addOpen} onClose={() => setAddOpen(false)} title="Aggiungi">
        <List label="Cosa vuoi aggiungere">
          {quickActions.map((action) => (
            <ListRow
              key={action.label}
              icon={action.icon}
              title={action.label}
              subtitle={action.description}
              onClick={() => {
                setAddOpen(false)
                if (action.sheet) sheet.open(action.sheet)
                else navigate(action.to!)
              }}
              chevron
            />
          ))}
        </List>
      </BottomSheet>
      <FormSheetHost />
      <ScrollRestoration />
    </div>
  )
}
