import { useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { FiEdit2, FiPlus, FiRepeat, FiTrash2 } from 'react-icons/fi'
import { paths, useBack } from '../../app/navigation'
import { useBuys, useGroups } from '../../data/hooks'
import { useUndoableDelete, useWithoutPendingDeletes } from '../../data/pendingDeletes'
import { buysOfGroup, buysToDelete, type BuyFilter } from '../../domain/buys'
import { idOf } from '../../domain/numbers'
import type { Buy } from '../../domain/types'
import {
  Amount,
  BottomSheet,
  Button,
  Card,
  DataState,
  EmptyState,
  IconButton,
  List,
  ListRow,
  Page,
  SegmentedControl,
  SkeletonCard,
  SkeletonList,
} from '../../ui'
import { shortDate } from '../shared/format'
import { buyIcon } from '../shared/icons'
import { inclusionLabel } from './GroupsList'

const filters: { value: BuyFilter; label: string; empty: string }[] = [
  { value: 'current', label: 'Anno', empty: "Nessuna spesa quest'anno" },
  { value: 'future', label: 'Future', empty: 'Nessuna spesa futura' },
  { value: 'past', label: 'Passate', empty: 'Nessuna spesa negli anni precedenti' },
  { value: 'all', label: 'Tutte', empty: 'Nessuna spesa' },
]

/** Spese di un gruppo per periodo, con modifica/eliminazione via swipe. */
export default function GroupDetail() {
  const { groupId = '' } = useParams()
  const navigate = useNavigate()
  const back = useBack(paths.expenses)
  const [params, setParams] = useSearchParams()
  const filter = (filters.find((item) => item.value === params.get('periodo'))?.value ?? 'current') as BuyFilter
  const buys = useBuys()
  const groups = useGroups()
  const remove = useUndoableDelete()
  const [seriesChoice, setSeriesChoice] = useState<Buy | null>(null)
  const group = groups.data.find((item) => idOf(item) === groupId || item.id === groupId)
  const visibleBuys = useWithoutPendingDeletes('buy', buys.data)
  const { records, total } = useMemo(() => buysOfGroup(visibleBuys, groupId, filter), [visibleBuys, groupId, filter])
  const status =
    buys.status === 'error' || groups.status === 'error'
      ? 'error'
      : buys.status === 'loading' || groups.status === 'loading'
        ? 'loading'
        : 'ready'

  const askDelete = (buy: Buy) => {
    if (buy.uid_father) setSeriesChoice(buy)
    else remove('buy', [buy], `${buy.name || 'Spesa'} eliminata`)
  }

  if (status === 'ready' && !group) {
    return (
      <EmptyState
        title="Gruppo non trovato"
        message="Potrebbe essere stato eliminato."
        action={<Button onClick={() => navigate(paths.expenses, { replace: true })}>Torna alle spese</Button>}
      />
    )
  }

  const family = seriesChoice ? buysToDelete(seriesChoice, buys.data, 'family') : []
  const emptyText = filters.find((item) => item.value === filter)!.empty

  return (
    <Page
      title={group?.name || (status === 'loading' ? '…' : 'Gruppo senza nome')}
      subtitle={group ? inclusionLabel(group) : undefined}
      back={{ label: 'Spese', onClick: back }}
      actions={
        <>
          <IconButton label="Modifica gruppo" icon={<FiEdit2 />} onClick={() => navigate(paths.editGroup(groupId))} />
          <IconButton
            label="Nuova spesa"
            icon={<FiPlus />}
            onClick={() => navigate(`${paths.newBuy}?gruppo=${encodeURIComponent(groupId)}`)}
          />
        </>
      }
    >
      <SegmentedControl
        label="Periodo"
        value={filter}
        onChange={(value) => setParams(value === 'current' ? {} : { periodo: value }, { replace: true })}
        options={filters}
      />
      <DataState
        status={status}
        onRetry={() => (buys.retry(), groups.retry())}
        skeleton={
          <>
            <SkeletonCard />
            <SkeletonList rows={4} />
          </>
        }
        isEmpty={!records.length}
        empty={
          <EmptyState
            title={emptyText}
            action={
              <Button onClick={() => navigate(`${paths.newBuy}?gruppo=${encodeURIComponent(groupId)}`)}>
                Aggiungi spesa
              </Button>
            }
          />
        }
      >
        <Card>
          <p className="text-[15px] font-semibold text-muted">Totale</p>
          <Amount value={total} size="lg" />
          <p className="mt-1 text-[13px] text-muted">
            {records.length} {records.length === 1 ? 'spesa' : 'spese'}
          </p>
        </Card>
        <List label="Spese del gruppo">
          {records.map((buy) => {
            const Icon = buyIcon(buy.icon)
            return (
              <ListRow
                key={idOf(buy)}
                to={paths.buy(idOf(buy))}
                icon={<Icon />}
                title={buy.name || 'Spesa senza nome'}
                subtitle={
                  <span className="flex items-center gap-1">
                    {shortDate(buy.data_valore)}
                    {buy.uid_father && (
                      <>
                        <span aria-hidden="true">·</span>
                        <FiRepeat aria-hidden="true" />
                        <span>ricorrente</span>
                      </>
                    )}
                  </span>
                }
                trailing={<Amount value={Number(buy.amount) || 0} size="sm" />}
                chevron={false}
                actions={[
                  { label: 'Modifica', icon: <FiEdit2 />, onAction: () => navigate(paths.buy(idOf(buy))) },
                  { label: 'Elimina', icon: <FiTrash2 />, tone: 'destructive', onAction: () => askDelete(buy) },
                ]}
              />
            )
          })}
        </List>
      </DataState>
      <BottomSheet open={Boolean(seriesChoice)} onClose={() => setSeriesChoice(null)} title="Elimina spesa ricorrente">
        <p className="text-[15px] text-muted">
          “{seriesChoice?.name}” fa parte di una serie di {family.length} spese.
        </p>
        <div className="mt-4 flex flex-col gap-2">
          <Button
            variant="destructive"
            block
            onClick={() => {
              remove('buy', [seriesChoice!], `${seriesChoice!.name || 'Spesa'} eliminata`)
              setSeriesChoice(null)
            }}
          >
            Solo questa spesa
          </Button>
          <Button
            variant="destructive"
            block
            onClick={() => {
              remove('buy', family, `${family.length} spese della serie eliminate`)
              setSeriesChoice(null)
            }}
          >
            Tutta la serie ({family.length})
          </Button>
          <Button variant="plain" block onClick={() => setSeriesChoice(null)}>
            Annulla
          </Button>
        </div>
      </BottomSheet>
    </Page>
  )
}
