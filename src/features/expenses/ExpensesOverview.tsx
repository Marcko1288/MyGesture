import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { FiList, FiPlus } from 'react-icons/fi'
import { paths, useSheet } from '../../app/navigation'
import { useBuys, useGroups } from '../../data/hooks'
import { expensesByGroup } from '../../domain/buys'
import type { Group } from '../../domain/types'
import { idOf } from '../../domain/numbers'
import {
  Amount,
  Button,
  Card,
  DataState,
  EmptyState,
  IconButton,
  List,
  ListRow,
  Page,
  SectionTitle,
  SkeletonCard,
  SkeletonList,
} from '../../ui'
import { Donut, LegendDot, seriesColor } from '../../ui/charts'
import { percent } from '../shared/format'
import { groupIcon } from '../shared/icons'

/** Colore stabile di un gruppo: posizione per uid (non cambia con i totali né col nome). */
export function groupColors(groups: Group[]): Map<string, string> {
  const ids = groups.map(idOf).sort()
  return new Map(ids.map((id, index) => [id, seriesColor(index)]))
}

/** "Quanto ho speso quest'anno, e dove?" */
export default function ExpensesOverview() {
  const navigate = useNavigate()
  const sheet = useSheet()
  const buys = useBuys()
  const groups = useGroups()
  const year = new Date().getFullYear()
  const result = useMemo(() => expensesByGroup(buys.data, groups.data), [buys.data, groups.data])
  const colors = useMemo(() => groupColors(groups.data), [groups.data])
  const status =
    buys.status === 'error' || groups.status === 'error'
      ? 'error'
      : buys.status === 'loading' || groups.status === 'loading'
        ? 'loading'
        : 'ready'
  const included = [...result.included].sort((a, b) => b.value - a.value)

  return (
    <Page
      title="Spese"
      subtitle={`Dal 1° gennaio a oggi · ${year}`}
      actions={
        <>
          <IconButton label="Tutti i gruppi" icon={<FiList />} onClick={() => navigate(paths.groups)} />
          <IconButton label="Nuova spesa" icon={<FiPlus />} onClick={() => sheet.open('spesa')} />
        </>
      }
    >
      <DataState
        status={status}
        onRetry={() => (buys.retry(), groups.retry())}
        skeleton={
          <>
            <SkeletonCard lines={2} />
            <SkeletonList rows={4} />
          </>
        }
        isEmpty={!groups.data.length || !included.length}
        empty={
          !groups.data.length ? (
            <EmptyState
              title="Nessun gruppo di spese"
              message="Crea un gruppo (es. Casa, Auto) e aggiungi le tue spese."
              action={<Button onClick={() => sheet.open('gruppo')}>Crea un gruppo</Button>}
            />
          ) : (
            <EmptyState
              title={`Nessuna spesa nel ${year}`}
              message="Le spese dei gruppi inclusi nei totali compariranno qui."
              action={<Button onClick={() => sheet.open('spesa')}>Aggiungi spesa</Button>}
            />
          )
        }
      >
        <Card>
          <div className="flex items-center gap-4">
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-semibold text-muted">Totale</p>
              <Amount value={result.total} size="lg" />
              <p className="mt-1 text-[13px] text-muted">
                {included.length} {included.length === 1 ? 'gruppo' : 'gruppi'} nei totali
              </p>
            </div>
            <Donut
              size={112}
              data={included.map((item) => ({
                key: item.id,
                value: Math.max(0, item.value),
                color: colors.get(item.id)!,
              }))}
            />
          </div>
        </Card>
        <List label="Spese per gruppo">
          {included.map((item) => {
            const Icon = groupIcon(item.group.icon)
            return (
              <ListRow
                key={item.id}
                to={paths.group(item.id)}
                icon={<Icon />}
                title={
                  <span className="flex items-center gap-2">
                    <LegendDot color={colors.get(item.id)!} />
                    <span className="truncate">{item.name}</span>
                  </span>
                }
                subtitle={`${percent(item.value, result.total)} del totale`}
                trailing={<Amount value={item.value} size="sm" />}
              />
            )
          })}
        </List>
        {result.excluded.length > 0 && (
          <>
            <SectionTitle>Esclusi dai totali</SectionTitle>
            <List label="Gruppi esclusi dai totali">
              {result.excluded.map((item) => {
                const Icon = groupIcon(item.group.icon)
                return (
                  <ListRow
                    key={item.id}
                    to={paths.group(item.id)}
                    icon={<Icon />}
                    iconClassName="bg-surface-2 text-muted"
                    title={item.name}
                    trailing={<Amount value={item.value} size="sm" tone="muted" />}
                  />
                )
              })}
            </List>
          </>
        )}
      </DataState>
    </Page>
  )
}
