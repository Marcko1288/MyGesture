import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'

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
  editGroup: (id: string) => `/spese/gruppi/${encodeURIComponent(id)}/modifica`,
  buy: (id: string) => `/spese/${encodeURIComponent(id)}`,
  statement: '/conto',
  statementCategory: (category: string) => `/conto/categoria/${encodeURIComponent(category)}`,
  statementTrend: (category: string) => `/conto/categoria/${encodeURIComponent(category)}/andamento`,
  statementRecord: (id: string) => `/conto/movimento/${encodeURIComponent(id)}`,
  statementImport: '/conto/importa',
  more: '/altro',
  savings: '/altro/risparmi',
  cashHistory: '/altro/risparmi/storico',
  cash: (id: string) => `/altro/saldo/${encodeURIComponent(id)}`,
  subscriptions: '/altro/abbonamenti',
  subscription: (id: string) => `/altro/abbonamenti/${encodeURIComponent(id)}`,
  renewSubscription: (id: string) => `/altro/abbonamenti/${encodeURIComponent(id)}/rinnovo`,
  settings: '/altro/impostazioni',
  newBuy: '/nuovo/spesa',
  newCash: '/nuovo/saldo',
  newSubscription: '/nuovo/abbonamento',
  newGroup: '/nuovo/gruppo',
  login: '/login',
} as const
