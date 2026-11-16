import { NavLink } from 'react-router-dom'
import { FiCreditCard, FiHome, FiMoreHorizontal, FiPieChart, FiPlus } from 'react-icons/fi'
import { cn } from './cn'

const tabs = [
  { to: '/', label: 'Oggi', icon: FiHome, end: true },
  { to: '/spese', label: 'Spese', icon: FiPieChart },
  null,
  { to: '/conto', label: 'Conto', icon: FiCreditCard },
  { to: '/altro', label: 'Altro', icon: FiMoreHorizontal },
] as const

/** Tab bar in basso stile iOS con pulsante centrale "Aggiungi". Rispetta la safe area inferiore. */
export function TabBar({ onAdd, addOpen }: { onAdd: () => void; addOpen?: boolean }) {
  return (
    <nav
      aria-label="Navigazione principale"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/90 backdrop-blur-xl"
      style={{
        paddingBottom: 'var(--safe-bottom)',
        paddingLeft: 'var(--safe-left)',
        paddingRight: 'var(--safe-right)',
      }}
    >
      <ul className="mx-auto flex h-[var(--tabbar-height)] max-w-lg items-stretch">
        {tabs.map((tab) =>
          tab ? (
            <li key={tab.to} className="flex-1">
              <NavLink
                to={tab.to}
                end={'end' in tab ? tab.end : false}
                className={({ isActive }) =>
                  cn(
                    'flex h-full flex-col items-center justify-center gap-0.5 text-[11px] font-medium',
                    isActive ? 'text-accent-strong' : 'text-muted',
                  )
                }
              >
                <tab.icon aria-hidden="true" className="text-[24px]" />
                {tab.label}
              </NavLink>
            </li>
          ) : (
            <li key="add" className="flex flex-1 items-center justify-center">
              <button
                type="button"
                onClick={onAdd}
                aria-label="Aggiungi"
                aria-haspopup="dialog"
                aria-expanded={addOpen}
                className="grid size-12 place-items-center rounded-full bg-accent text-[26px] text-on-accent shadow-md transition-transform duration-150 active:scale-95"
              >
                <FiPlus aria-hidden="true" />
              </button>
            </li>
          ),
        )}
      </ul>
    </nav>
  )
}
