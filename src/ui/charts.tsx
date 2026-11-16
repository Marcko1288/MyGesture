/**
 * Grafici: le parti leggere (colori, barra di avanzamento, pallini di legenda) sono qui; quelle con Recharts
 * (chartsImpl.tsx) vengono caricate in un chunk separato, con un segnaposto della stessa misura nel frattempo.
 */
import { lazy, Suspense, type ComponentProps } from 'react'

const SERIES = 8

export interface DonutSlice {
  key: string
  value: number
  color: string
}

export interface BarDatum {
  key: string
  label: string
  value: number
}

/** Colore della serie in base alla posizione STABILE dell'entità (non al suo valore). Oltre l'8ª: grigio "Altro". */
export function seriesColor(index: number): string {
  return index >= 0 && index < SERIES ? `var(--series-${index + 1})` : 'var(--series-other)'
}

/** Barra di avanzamento semplice (es. uscite rispetto alle entrate). */
export function ProgressBar({ value, max, label }: { value: number; max: number; label: string }) {
  const ratio = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(ratio * 100)}
      className="h-2 overflow-hidden rounded-full bg-surface-2"
    >
      <div
        className="h-full rounded-full bg-accent transition-[width] duration-200"
        style={{ width: `${ratio * 100}%` }}
      />
    </div>
  )
}

/** Pallino colorato di legenda accanto al nome (l'identità non è affidata al solo colore). */
export function LegendDot({ color }: { color: string }) {
  return <span aria-hidden="true" className="inline-block size-3 shrink-0 rounded-full" style={{ background: color }} />
}

const Impl = {
  Donut: lazy(() => import('./chartsImpl').then((module) => ({ default: module.Donut }))),
  MiniBars: lazy(() => import('./chartsImpl').then((module) => ({ default: module.MiniBars }))),
  Bars: lazy(() => import('./chartsImpl').then((module) => ({ default: module.Bars }))),
}

function Placeholder({ width, height, round }: { width?: number; height: number; round?: boolean }) {
  return (
    <div
      aria-hidden="true"
      className={round ? 'mx-auto rounded-full bg-surface-2' : 'rounded-lg bg-surface-2'}
      style={{ width: width ?? '100%', height }}
    />
  )
}

export function Donut(props: ComponentProps<typeof Impl.Donut>) {
  const size = props.size ?? 168
  return (
    <Suspense fallback={<Placeholder width={size} height={size} round />}>
      <Impl.Donut {...props} />
    </Suspense>
  )
}

export function MiniBars(props: ComponentProps<typeof Impl.MiniBars>) {
  return (
    <Suspense fallback={<Placeholder height={props.height ?? 56} />}>
      <Impl.MiniBars {...props} />
    </Suspense>
  )
}

export function Bars(props: ComponentProps<typeof Impl.Bars>) {
  return (
    <Suspense fallback={<Placeholder height={props.height ?? 200} />}>
      <Impl.Bars {...props} />
    </Suspense>
  )
}
