import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FiPlus } from 'react-icons/fi'
import { paths, useBack } from '../../app/navigation'
import { useUserId } from '../../data/auth'
import { useBuys, useGroups } from '../../data/hooks'
import { commitInBatches, createOperation } from '../../data/mutations'
import { groupTotals, yearEndBalance } from '../../domain/buys'
import { formatDate } from '../../domain/format'
import type { Group } from '../../domain/types'
import {
  Amount,
  BottomSheet,
  Button,
  DataState,
  EmptyState,
  IconButton,
  List,
  ListRow,
  Page,
  SkeletonList,
  useToast,
} from '../../ui'
import { groupIcon } from '../shared/icons'

export function inclusionLabel(group: Group) {
  if (group.all === true) return 'Incluso nei totali'
  if (group.all === false) return 'Escluso dai totali'
  return 'Non incluso nei totali'
}

/** Tutti i gruppi con il totale dell'anno, e il pareggio di fine anno. */
export default function GroupsList() {
  const navigate = useNavigate()
  const back = useBack(paths.expenses)
  const userId = useUserId()
  const toast = useToast()
  const buys = useBuys()
  const groups = useGroups()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [running, setRunning] = useState(false)
  const totals = useMemo(
    () => groupTotals(groups.data, buys.data).sort((a, b) => a.name.localeCompare(b.name, 'it')),
    [groups.data, buys.data],
  )
  const balance = useMemo(() => yearEndBalance(groups.data, buys.data), [groups.data, buys.data])
  const names = new Map(groups.data.map((group) => [group.uid ?? group.id, group.name || 'Gruppo senza nome']))
  const status =
    buys.status === 'error' || groups.status === 'error'
      ? 'error'
      : buys.status === 'loading' || groups.status === 'loading'
        ? 'loading'
        : 'ready'

  async function runBalance() {
    setRunning(true)
    try {
      await commitInBatches(balance.entries.map((entry) => createOperation('buy', entry, userId).operation))
      setConfirmOpen(false)
      toast({
        message: `Pareggio ${balance.previousYear} completato per ${balance.balancedGroups} ${balance.balancedGroups === 1 ? 'gruppo' : 'gruppi'}.`,
      })
    } catch (error) {
      console.error(error)
      toast({ message: 'Pareggio non riuscito: riprova.', tone: 'error' })
    } finally {
      setRunning(false)
    }
  }

  return (
    <Page
      title="Gruppi"
      subtitle="Totali dal 1° gennaio a oggi"
      back={{ label: 'Spese', onClick: back }}
      actions={<IconButton label="Nuovo gruppo" icon={<FiPlus />} onClick={() => navigate(paths.newGroup)} />}
    >
      <DataState
        status={status}
        onRetry={() => (buys.retry(), groups.retry())}
        skeleton={<SkeletonList rows={5} />}
        isEmpty={!totals.length}
        empty={
          <EmptyState
            title="Nessun gruppo"
            action={<Button onClick={() => navigate(paths.newGroup)}>Crea un gruppo</Button>}
          />
        }
      >
        <List label="Gruppi">
          {totals.map((item) => {
            const Icon = groupIcon(item.group.icon)
            return (
              <ListRow
                key={item.id}
                to={paths.group(item.id)}
                icon={<Icon />}
                iconClassName={item.group.all === true ? undefined : 'bg-surface-2 text-muted'}
                title={item.name}
                subtitle={inclusionLabel(item.group)}
                trailing={<Amount value={item.value} size="sm" />}
              />
            )
          })}
        </List>
        <Button
          variant="secondary"
          block
          onClick={() =>
            balance.entries.length
              ? setConfirmOpen(true)
              : toast({ message: `Non ci sono importi da pareggiare per il ${balance.previousYear}.`, tone: 'info' })
          }
        >
          Pareggio {balance.previousYear}
        </Button>
        <p className="px-1 text-[13px] text-muted">
          Azzera il saldo {balance.previousYear} di ogni gruppo e lo riporta al 1° gennaio {balance.previousYear + 1}.
          Ripeterlo non crea doppioni.
        </p>
      </DataState>
      <BottomSheet
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title={`Pareggio ${balance.previousYear}`}
        footer={
          <Button block onClick={runBalance} disabled={running}>
            {running
              ? 'Pareggio in corso…'
              : `Esegui per ${balance.balancedGroups} ${balance.balancedGroups === 1 ? 'gruppo' : 'gruppi'}`}
          </Button>
        }
      >
        <p className="text-[15px] text-muted">Verranno create queste spese:</p>
        <List className="mt-3" label="Spese del pareggio">
          {balance.entries.map((entry, index) => (
            <ListRow
              key={index}
              title={`${names.get(entry.group ?? '') ?? 'Gruppo'} · ${entry.name}`}
              subtitle={formatDate(entry.data_valore) ?? ''}
              trailing={<Amount value={entry.amount ?? 0} tone="signed" size="sm" />}
              chevron={false}
            />
          ))}
        </List>
      </BottomSheet>
    </Page>
  )
}
