import { useEffect, useState } from 'react'
import { Bar, BarChart, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import './SavingsView.css'
import CashHistoryView from './CashHistoryView.jsx'
import { toFirestoreDate } from '../utils/firestoreDate.js'

function cashTotal(cash) { const number = (value) => Number(value) || 0; return number(cash.conto) + number(cash.anticipo) + number(cash.otherp) - number(cash.otherm) }
function periodSavings(records, period) {
  const periods = new Map()
  records.forEach((record) => {
    const date = toFirestoreDate(record.data_valore ?? record.data_ins); if (!date) return
    const key = period === 'monthly' ? `${date.getFullYear()}-${date.getMonth()}` : String(date.getFullYear())
    const current = periods.get(key)
    if (!current || date > current.date) periods.set(key, { date, value: cashTotal(record) })
  })
  return [...periods.values()].sort((a, b) => a.date - b.date).slice(-4).map(({ date, value }) => ({ label: period === 'monthly' ? new Intl.DateTimeFormat('it-IT', { month: 'short', year: '2-digit' }).format(date) : String(date.getFullYear()), value }))
}
function formatCompactEuro(value) { const absolute = Math.abs(value); if (absolute >= 1000) return `${value < 0 ? '-' : ''}${new Intl.NumberFormat('it-IT', { maximumFractionDigits: 1 }).format(absolute / 1000)}k\u20AC`; return `${new Intl.NumberFormat('it-IT', { maximumFractionDigits: 0 }).format(value)}\u20AC` }
function formatDeltaEuro(value) { return `${value > 0 ? '+' : ''}${formatCompactEuro(value)}` }

function ValueChart({ data }) { return <div className="chart-wrap"><ResponsiveContainer width="100%" height="100%"><BarChart data={data} margin={{ top: 30, right: 10, left: 2, bottom: 2 }}><XAxis dataKey="label" axisLine={false} tickLine={false} height={42} interval={0} tick={{ fontSize: 12 }}/><YAxis axisLine={false} tickLine={false} width={58} tickFormatter={formatCompactEuro} tick={{ fontSize: 12 }}/><Tooltip formatter={(value) => [new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(value), 'Risparmi']} cursor={{ fill: 'color-mix(in srgb, var(--accent-color) 8%, transparent)' }}/><Bar dataKey="value" fill="var(--accent-color)" radius={[7, 7, 0, 0]} maxBarSize={58}><LabelList dataKey="value" position="top" formatter={formatCompactEuro} fill="var(--text-main)" fontSize={12}/></Bar></BarChart></ResponsiveContainer></div> }
function DeltaChart({ data }) { return <div className="chart-wrap"><ResponsiveContainer width="100%" height="100%"><BarChart data={data} margin={{ top: 30, right: 10, left: 2, bottom: 2 }}><XAxis dataKey="label" axisLine={false} tickLine={false} height={42} interval={0} tick={{ fontSize: 12 }}/><YAxis axisLine={false} tickLine={false} width={58} tickFormatter={formatCompactEuro} tick={{ fontSize: 12 }}/><Tooltip formatter={(value) => [formatDeltaEuro(value), 'Variazione']} cursor={{ fill: 'color-mix(in srgb, var(--accent-color) 8%, transparent)' }}/><Bar dataKey="value" radius={[7, 7, 0, 0]} maxBarSize={58}>{data.map((item) => <Cell key={item.label} fill="color-mix(in srgb, var(--accent-color) 72%, var(--surface))"/>)}<LabelList dataKey="value" position="top" formatter={formatDeltaEuro} fill="var(--text-main)" fontSize={12}/></Bar></BarChart></ResponsiveContainer></div> }

export default function SavingsView({ cashRecords = [], onSelectCash, showHistory, onShowHistoryChange }) {
  const [period, setPeriod] = useState('monthly')
  const savings = periodSavings(cashRecords, period)
  const deltas = savings.slice(1).map((item, index) => ({ label: item.label, value: item.value - savings[index].value }))
  const isMonthly = period === 'monthly'
  useEffect(() => { window.scrollTo({ top: 0, left: 0, behavior: 'auto' }) }, [showHistory])
  if (showHistory) return <CashHistoryView cashRecords={cashRecords} onBack={() => onShowHistoryChange(false)} onSelectCash={onSelectCash}/>
  return <><div className="section-heading"><h1>Gestione Risparmi</h1><div className="period-selector" role="tablist" aria-label="Intervallo del grafico"><button type="button" role="tab" aria-selected={isMonthly} className={isMonthly ? 'active' : ''} onClick={() => setPeriod('monthly')}>Mensile</button><button type="button" role="tab" aria-selected={!isMonthly} className={!isMonthly ? 'active' : ''} onClick={() => setPeriod('yearly')}>Annuale</button></div></div>{savings.length ? <><section className="chart-card"><div><h2>Saldo {isMonthly ? 'mensile' : 'annuale'}</h2><p>Ultimi 4 {isMonthly ? 'mesi' : 'anni'}</p></div><ValueChart data={savings}/></section>{deltas.length > 0 && <section className="chart-card"><div><h2>Variazione {isMonthly ? 'mensile' : 'annuale'}</h2><p>Delta rispetto al {isMonthly ? 'mese' : 'anno'} precedente</p></div><DeltaChart data={deltas}/></section>}</> : <section className="chart-card"><p className="empty-chart">Non ci sono ancora dati Cash da mostrare.</p></section>}<div className="cash-history-action"><button type="button" onClick={() => onShowHistoryChange(true)}>Storico</button></div></>
}
