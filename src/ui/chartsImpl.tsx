/**
 * Grafici (Recharts) con le regole del design system: segni sottili, angoli arrotondati alla fine del dato,
 * 2px di distacco tra le fette, assi recessivi, colore che segue l'entità. Ogni grafico è accompagnato
 * nella schermata da una legenda/lista con nomi e importi (il colore non è mai l'unica informazione).
 */
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { formatCompactEuro, formatCurrency } from '../domain/format'

const SERIES = 8

/** Colore della serie in base alla posizione STABILE dell'entità (non al suo valore). Oltre l'8ª: grigio "Altro". */
export function seriesColor(index: number): string {
  return index >= 0 && index < SERIES ? `var(--series-${index + 1})` : 'var(--series-other)'
}

export interface DonutSlice {
  key: string
  value: number
  color: string
}

/** Ciambella compatta con il totale al centro. Le fette sono decorative: i dati sono nella legenda accanto. */
export function Donut({ data, centerLabel, size = 168 }: { data: DonutSlice[]; centerLabel?: string; size?: number }) {
  const visible = data.filter((slice) => slice.value > 0)
  return (
    <div className="relative mx-auto" style={{ width: size, height: size }} aria-hidden="true" inert>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart accessibilityLayer={false} tabIndex={-1}>
          <Pie
            data={visible.length ? visible : [{ key: 'vuoto', value: 1, color: 'var(--surface-2)' }]}
            dataKey="value"
            nameKey="key"
            innerRadius="68%"
            outerRadius="100%"
            startAngle={90}
            endAngle={-270}
            stroke="var(--surface)"
            strokeWidth={2}
            isAnimationActive={false}
          >
            {(visible.length ? visible : [{ key: 'vuoto', color: 'var(--surface-2)' }]).map((slice) => (
              <Cell key={slice.key} fill={slice.color} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      {centerLabel && (
        <span className="absolute inset-0 grid place-items-center text-[15px] font-semibold text-muted">
          {centerLabel}
        </span>
      )}
    </div>
  )
}

/** Mini barre senza assi (andamento nelle card). L'ultimo valore è evidenziato. */
export function MiniBars({
  data,
  height = 56,
  label,
}: {
  data: { key: string; value: number }[]
  height?: number
  label: string
}) {
  return (
    <div style={{ height }} role="img" aria-label={label}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 2, right: 0, bottom: 0, left: 0 }}
          barCategoryGap={3}
          accessibilityLayer={false}
        >
          <Bar dataKey="value" radius={[4, 4, 0, 0]} isAnimationActive={false} minPointSize={2}>
            {data.map((item, index) => (
              <Cell
                key={item.key}
                fill={
                  index === data.length - 1 ? 'var(--accent)' : 'color-mix(in srgb, var(--accent) 35%, var(--surface))'
                }
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export interface BarDatum {
  key: string
  label: string
  value: number
}

/**
 * Barre con asse X (periodi) e asse Y compatto, tooltip al tocco. Con `signed` le barre negative
 * sono rosse e le positive verdi (variazioni); altrimenti colore principale.
 */
export function Bars({
  data,
  height = 200,
  label,
  signed = false,
  selectedKey,
  onSelect,
}: {
  data: BarDatum[]
  height?: number
  label: string
  signed?: boolean
  selectedKey?: string
  onSelect?: (key: string) => void
}) {
  return (
    <div style={{ height }} role="img" aria-label={label} className="-ml-2">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: 0 }} barCategoryGap="28%">
          <XAxis
            dataKey="label"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: 'var(--muted)' }}
            interval={0}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            width={52}
            tick={{ fontSize: 12, fill: 'var(--muted)' }}
            tickFormatter={(value: number) => formatCompactEuro(value)}
          />
          <Tooltip
            cursor={{ fill: 'var(--surface-2)' }}
            formatter={(value) => [formatCurrency(Number(value)), '']}
            separator=""
            contentStyle={{
              background: 'var(--surface)',
              border: '1px solid var(--line)',
              borderRadius: 12,
              color: 'var(--fg)',
              fontSize: 13,
            }}
            labelStyle={{ color: 'var(--muted)' }}
          />
          <Bar
            dataKey="value"
            radius={[4, 4, 4, 4]}
            maxBarSize={36}
            isAnimationActive={false}
            onClick={onSelect ? (entry) => onSelect((entry as unknown as BarDatum).key) : undefined}
            cursor={onSelect ? 'pointer' : undefined}
          >
            {data.map((item) => {
              const base = signed ? (item.value >= 0 ? 'var(--positive)' : 'var(--negative)') : 'var(--accent)'
              const dim = selectedKey !== undefined && item.key !== selectedKey
              return <Cell key={item.key} fill={dim ? `color-mix(in srgb, ${base} 35%, var(--surface))` : base} />
            })}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
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
