import { useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

/**
 * "Indietro" coerente con il gesto di iOS: se c'è una pagina precedente dell'app torna lì,
 * altrimenti (link aperto direttamente o pagina ricaricata) va alla schermata padre.
 */
export function useBack(fallback: string) {
  const navigate = useNavigate()
  return useCallback(() => {
    const index = (window.history.state as { idx?: number } | null)?.idx ?? 0
    if (index > 0) navigate(-1)
    else navigate(fallback, { replace: true })
  }, [navigate, fallback])
}

export const paths = {
  home: '/',
  expenses: '/spese',
  groups: '/spese/gruppi',
  group: (id: string) => `/spese/gruppi/${encodeURIComponent(id)}`,
  statement: '/conto',
  statementCategory: (category: string) => `/conto/categoria/${encodeURIComponent(category)}`,
  statementTrend: (category: string) => `/conto/categoria/${encodeURIComponent(category)}/andamento`,
  statementRecord: (id: string) => `/conto/movimento/${encodeURIComponent(id)}`,
  statementImport: '/conto/importa',
  more: '/altro',
  savings: '/altro/risparmi',
  cashHistory: '/altro/risparmi/storico',
  subscriptions: '/altro/abbonamenti',
  settings: '/altro/impostazioni',
  catalog: '/altro/componenti',
  categoryRules: '/altro/impostazioni/categorie',
  login: '/login',
} as const

/** Fogli dal basso aperti sopra la schermata corrente, con stato nell'URL (`?foglio=spesa&id=BUY_…`). */
export type SheetKind = 'spesa' | 'saldo' | 'abbonamento' | 'rinnovo' | 'gruppo'
export const SHEET_KINDS: SheetKind[] = ['spesa', 'saldo', 'abbonamento', 'rinnovo', 'gruppo']
const SHEET_PARAMS = ['foglio', 'id', 'gruppo']

/** Link alla pagina `pathname` con il foglio aperto (mantiene gli altri parametri, es. il mese). */
export function sheetHref(
  pathname: string,
  search: string,
  kind: SheetKind,
  id?: string,
  extra: Record<string, string> = {},
) {
  const params = new URLSearchParams(search)
  SHEET_PARAMS.forEach((key) => params.delete(key))
  params.set('foglio', kind)
  if (id) params.set('id', id)
  Object.entries(extra).forEach(([key, value]) => params.set(key, value))
  return `${pathname}?${params.toString()}`
}

export function useSheet() {
  const navigate = useNavigate()
  const location = useLocation()
  const params = new URLSearchParams(location.search)
  const kindParam = params.get('foglio') as SheetKind | null
  const kind = kindParam && SHEET_KINDS.includes(kindParam) ? kindParam : null
  const id = params.get('id') ?? undefined
  const group = params.get('gruppo') ?? undefined

  const link = useCallback(
    (sheet: SheetKind, recordId?: string, extra?: Record<string, string>) =>
      sheetHref(location.pathname, location.search, sheet, recordId, extra),
    [location.pathname, location.search],
  )
  /** Apre un foglio (una voce di cronologia: "indietro" lo chiude). */
  const open = useCallback(
    (sheet: SheetKind, recordId?: string, extra?: Record<string, string>) =>
      navigate(link(sheet, recordId, extra), { state: { sheet: true } }),
    [navigate, link],
  )
  /** Chiude il foglio: torna indietro se è stato aperto dall'app, altrimenti toglie i parametri. */
  const close = useCallback(() => {
    if ((location.state as { sheet?: boolean } | null)?.sheet) {
      navigate(-1)
      return
    }
    const next = new URLSearchParams(location.search)
    SHEET_PARAMS.forEach((key) => next.delete(key))
    const search = next.toString()
    navigate(`${location.pathname}${search ? `?${search}` : ''}`, { replace: true })
  }, [navigate, location])
  /** Sostituisce il foglio aperto con un altro (es. da modifica abbonamento a rinnovo). */
  const replace = useCallback(
    (sheet: SheetKind, recordId?: string) => navigate(link(sheet, recordId), { replace: true, state: location.state }),
    [navigate, link, location.state],
  )
  return { kind, id, group, open, close, link, replace }
}
