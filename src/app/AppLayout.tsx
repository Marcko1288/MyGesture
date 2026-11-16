import { useEffect, useState } from 'react'
import { Link, Outlet, ScrollRestoration, useLocation, useNavigate } from 'react-router-dom'
import {
  FiBell,
  FiChevronRight,
  FiCreditCard,
  FiDollarSign,
  FiFileText,
  FiHome,
  FiLayers,
  FiLogOut,
  FiMenu,
  FiPlus,
  FiSettings,
  FiShoppingBag,
  FiUpload,
  FiX,
} from 'react-icons/fi'
import { signOut, useAuth } from '../data/auth'
import { syncPushToken } from '../data/push'
import { paths } from './navigation'
import './AppLayout.css'

const navigation = [
  { label: 'Home', icon: FiHome, to: paths.home },
  { label: 'Gestione Risparmi', icon: FiCreditCard, to: paths.savings },
  { label: 'Spese', icon: FiDollarSign, to: paths.expenses },
  { label: 'Estratto Conto', icon: FiFileText, to: paths.statement },
  { label: 'Abbonamenti', icon: FiBell, to: paths.subscriptions },
  { label: 'Impostazioni', icon: FiSettings, to: paths.settings },
]

const quickActions = [
  { label: 'Risparmi', icon: FiDollarSign, className: 'cash', to: paths.newCash },
  { label: 'Gruppo', icon: FiLayers, className: 'group', to: paths.newGroup },
  { label: 'Spesa', icon: FiShoppingBag, className: 'buy', to: paths.newBuy },
  { label: 'Abbonamento', icon: FiBell, className: 'subscription', to: paths.newSubscription },
  { label: 'Carica Estratto Conto', icon: FiUpload, className: 'upload', to: paths.statementImport },
]

function isActive(pathname: string, to: string) {
  if (to === paths.home) return pathname === '/'
  if (to === paths.savings) return pathname.startsWith(paths.savings) || pathname.startsWith('/altro/saldo')
  return pathname.startsWith(to)
}

/** Shell provvisoria (stessa UI dell'app storica, ora con URL reali). Sostituita dalla tab bar nella Fase 3. */
export default function AppLayout() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const [quickAddOpen, setQuickAddOpen] = useState(false)
  const userId = user?.uid

  useEffect(() => {
    setMenuOpen(false)
    setQuickAddOpen(false)
  }, [pathname])

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

  return (
    <div className="app-shell">
      <header className="topbar">
        <button className="icon-button" type="button" onClick={() => setMenuOpen(true)} aria-label="Apri menu">
          <FiMenu />
        </button>
        <span className="app-title">My Gesture</span>
        <button
          className="icon-button quick-add-button"
          type="button"
          onClick={() => setQuickAddOpen(true)}
          aria-label="Aggiungi elemento"
        >
          <FiPlus />
        </button>
      </header>
      {quickAddOpen && (
        <div className="quick-add-layer" onClick={() => setQuickAddOpen(false)}>
          <div
            className="quick-add-dialog"
            role="dialog"
            aria-modal="true"
            aria-label="Aggiungi elemento"
            onClick={(event) => event.stopPropagation()}
          >
            <h2>Aggiungi</h2>
            {quickActions.map(({ label, icon: Icon, className, to }) => (
              <button key={to} type="button" onClick={() => navigate(to)}>
                <Icon className={`quick-add-icon ${className}`} />
                {label}
              </button>
            ))}
          </div>
        </div>
      )}
      {menuOpen && (
        <div className="menu-layer" onClick={() => setMenuOpen(false)}>
          <aside className="side-menu" onClick={(event) => event.stopPropagation()}>
            <div className="menu-heading">
              <div className="menu-brand">
                <span className="user-avatar" title={user?.email ?? undefined}>
                  {user?.email?.charAt(0).toUpperCase()}
                </span>
                <span>My Gesture</span>
              </div>
              <button className="icon-button" onClick={() => setMenuOpen(false)} aria-label="Chiudi menu">
                <FiX />
              </button>
            </div>
            <nav aria-label="Navigazione principale">
              {navigation.map(({ label, icon: Icon, to }) => (
                <Link
                  key={to}
                  to={to}
                  className={isActive(pathname, to) ? 'nav-item active' : 'nav-item'}
                  onClick={() => setMenuOpen(false)}
                >
                  <Icon />
                  <span>{label}</span>
                  <FiChevronRight className="nav-arrow" />
                </Link>
              ))}
            </nav>
            <button className="logout-button" onClick={() => signOut()}>
              <FiLogOut />
              Esci
            </button>
          </aside>
        </div>
      )}
      <main className="home-content">
        <Outlet />
      </main>
      <ScrollRestoration />
    </div>
  )
}
