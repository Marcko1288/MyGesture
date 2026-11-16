import { useId, type InputHTMLAttributes, type ReactNode } from 'react'
import { cn } from './cn'

const inputBase =
  'min-h-12 w-full rounded-xl border border-transparent bg-surface-2 px-4 text-[17px] outline-none focus:border-accent-strong'

/** Etichetta + campo + eventuale messaggio di errore (collegato con aria-describedby). */
export function Field({
  label,
  error,
  hint,
  children,
  id,
}: {
  label: string
  error?: string
  hint?: ReactNode
  children: (props: { id: string; describedBy?: string }) => ReactNode
  id?: string
}) {
  const generated = useId()
  const fieldId = id ?? generated
  const messageId = `${fieldId}-message`
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={fieldId} className="px-1 text-[13px] font-semibold text-muted">
        {label}
      </label>
      {children({ id: fieldId, describedBy: error || hint ? messageId : undefined })}
      {(error || hint) && (
        <p
          id={messageId}
          className={cn('px-1 text-[13px]', error ? 'text-negative' : 'text-muted')}
          role={error ? 'alert' : undefined}
        >
          {error ?? hint}
        </p>
      )}
    </div>
  )
}

export function TextInput({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(inputBase, className)} {...props} />
}

/** Importo in primo piano: grande, tastiera numerica decimale su iPhone, simbolo € a destra. */
export function AmountInput({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="relative">
      <input
        inputMode="decimal"
        autoComplete="off"
        placeholder="0,00"
        className={cn(inputBase, 'tabular min-h-16 pr-12 text-[34px] font-bold tracking-tight', className)}
        {...props}
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 right-4 grid place-items-center text-[28px] font-bold text-muted"
      >
        €
      </span>
    </div>
  )
}

export function DateInput({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input type="date" className={cn(inputBase, 'appearance-none', className)} {...props} />
}

/** Interruttore stile iOS (checkbox con ruolo switch). */
export function Toggle({
  label,
  checked,
  onChange,
  description,
}: {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
  description?: string
}) {
  const id = useId()
  return (
    <label htmlFor={id} className="flex min-h-12 items-center justify-between gap-3 rounded-xl bg-surface-2 px-4">
      <span>
        <span className="block text-[17px]">{label}</span>
        {description && <span className="block text-[13px] text-muted">{description}</span>}
      </span>
      <input
        id={id}
        type="checkbox"
        role="switch"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="peer sr-only"
      />
      <span
        aria-hidden="true"
        className="relative h-[31px] w-[51px] shrink-0 rounded-full bg-line transition-colors duration-150 peer-checked:bg-accent peer-focus-visible:outline-2 peer-focus-visible:outline-accent-strong after:absolute after:top-[2px] after:left-[2px] after:size-[27px] after:rounded-full after:bg-white after:shadow after:transition-transform after:duration-150 peer-checked:after:translate-x-5"
      />
    </label>
  )
}

/** Riga di chip scorrevole orizzontalmente (scelta di gruppo, icona, giorno…). */
export function ChipRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div role="group" aria-label={label} className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
      {children}
    </div>
  )
}
