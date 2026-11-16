import { cn } from './cn'

/** Segnaposto durante il caricamento (niente spinner). */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn('rounded-lg bg-surface-2 motion-safe:animate-pulse', className)} />
}

/** Card scheletro con titolo, numero grande e una riga di contesto. */
export function SkeletonCard({ lines = 1 }: { lines?: number }) {
  return (
    <div className="rounded-2xl bg-surface p-4 shadow-card" aria-hidden="true">
      <Skeleton className="h-4 w-28" />
      <Skeleton className="mt-3 h-9 w-44" />
      {Array.from({ length: lines }, (_, index) => (
        <Skeleton key={index} className="mt-3 h-3 w-3/5" />
      ))}
    </div>
  )
}

/** Lista scheletro. */
export function SkeletonList({ rows = 5 }: { rows?: number }) {
  return (
    <div className="overflow-hidden rounded-2xl bg-surface shadow-card" aria-hidden="true">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="flex items-center gap-3 border-b border-line px-4 py-3 last:border-0">
          <Skeleton className="size-9 rounded-full" />
          <div className="flex-1">
            <Skeleton className="h-4 w-2/5" />
            <Skeleton className="mt-2 h-3 w-1/4" />
          </div>
          <Skeleton className="h-4 w-16" />
        </div>
      ))}
    </div>
  )
}

/** Annuncio per gli screen reader mentre lo scheletro è visibile. */
export function LoadingLabel({ children = 'Caricamento…' }: { children?: string }) {
  return (
    <p role="status" className="sr-only">
      {children}
    </p>
  )
}
