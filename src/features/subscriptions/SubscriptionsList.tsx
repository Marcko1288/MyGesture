import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { FiPlus, FiRefreshCw, FiTrash2 } from 'react-icons/fi'
import { paths, useBack, useSheet } from '../../app/navigation'
import { useSubscriptions } from '../../data/hooks'
import { useUndoableDelete, useWithoutPendingDeletes } from '../../data/pendingDeletes'
import { idOf } from '../../domain/numbers'
import { daysLeft, filterSubscriptions, isRenewed, type SubscriptionFilter } from '../../domain/subscriptions'
import type { Subscription } from '../../domain/types'
import {
  Amount,
  Button,
  DataState,
  EmptyState,
  IconButton,
  List,
  ListRow,
  Page,
  SegmentedControl,
  SkeletonList,
} from '../../ui'
import { relativeDays, shortDate } from '../shared/format'
import { subscriptionIcon } from '../shared/icons'

const filters: { value: SubscriptionFilter; label: string; empty: string }[] = [
  { value: 'active', label: 'Attivi', empty: 'Nessun abbonamento attivo' },
  { value: 'expiring', label: 'In scadenza', empty: 'Nessun abbonamento in scadenza nei prossimi 30 giorni' },
  { value: 'past', label: 'Scaduti', empty: 'Nessun abbonamento scaduto' },
  { value: 'all', label: 'Tutti', empty: 'Nessun abbonamento' },
]

function describe(subscription: Subscription, all: Subscription[]) {
  const days = daysLeft(subscription)
  const date = shortDate(subscription.data_fine)
  if (days === null) return 'Scadenza non disponibile'
  if (days < 0) return `Scaduto il ${date}${isRenewed(subscription, all) ? ' · rinnovato' : ''}`
  if (days <= 30)
    return `Scade ${relativeDays(days)} · ${date}${isRenewed(subscription, all) ? ' · già rinnovato' : ''}`
  return `Scade il ${date}`
}

/** "Cosa scade?" Abbonamenti per stato, con rinnovo ed eliminazione via swipe. */
export default function SubscriptionsList() {
  const sheet = useSheet()
  const back = useBack(paths.more)
  const [params, setParams] = useSearchParams()
  const filter = filters.find((item) => item.value === params.get('filtro'))?.value ?? 'active'
  const subscriptions = useSubscriptions()
  const remove = useUndoableDelete()
  const visible = useWithoutPendingDeletes('subscription', subscriptions.data)
  const records = useMemo(() => filterSubscriptions(visible, filter), [visible, filter])

  return (
    <Page
      title="Abbonamenti"
      back={{ label: 'Altro', onClick: back }}
      actions={<IconButton label="Nuovo abbonamento" icon={<FiPlus />} onClick={() => sheet.open('abbonamento')} />}
    >
      <SegmentedControl
        label="Stato degli abbonamenti"
        value={filter}
        onChange={(value) => setParams(value === 'active' ? {} : { filtro: value }, { replace: true })}
        options={filters}
      />
      <DataState
        status={subscriptions.status}
        onRetry={subscriptions.retry}
        skeleton={<SkeletonList rows={5} />}
        isEmpty={!records.length}
        empty={
          <EmptyState
            title={filters.find((item) => item.value === filter)!.empty}
            action={
              filter === 'active' || filter === 'all' ? (
                <Button onClick={() => sheet.open('abbonamento')}>Aggiungi abbonamento</Button>
              ) : undefined
            }
          />
        }
      >
        <List label="Abbonamenti">
          {records.map((subscription) => {
            const Icon = subscriptionIcon(subscription.name)
            const days = daysLeft(subscription)
            const warn =
              filter !== 'past' && days !== null && days >= 0 && days <= 7 && !isRenewed(subscription, visible)
            return (
              <ListRow
                key={idOf(subscription)}
                onClick={() => sheet.open('abbonamento', idOf(subscription))}
                icon={<Icon />}
                iconClassName={warn ? 'bg-warning/15 text-warning' : undefined}
                title={subscription.name || 'Abbonamento senza nome'}
                subtitle={describe(subscription, visible)}
                trailing={<Amount value={Number(subscription.amount) || 0} size="sm" />}
                chevron={false}
                actions={[
                  {
                    label: 'Rinnova',
                    icon: <FiRefreshCw />,
                    onAction: () => sheet.open('rinnovo', idOf(subscription)),
                  },
                  {
                    label: 'Elimina',
                    icon: <FiTrash2 />,
                    tone: 'destructive',
                    onAction: () =>
                      remove('subscription', [subscription], `${subscription.name || 'Abbonamento'} eliminato`),
                  },
                ]}
              />
            )
          })}
        </List>
      </DataState>
    </Page>
  )
}
