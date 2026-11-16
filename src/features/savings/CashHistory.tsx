import { useMemo } from 'react'
import { FiDownload, FiEdit2, FiTrash2 } from 'react-icons/fi'
import { paths, useBack, useSheet } from '../../app/navigation'
import { useCash } from '../../data/hooks'
import { useUndoableDelete, useWithoutPendingDeletes } from '../../data/pendingDeletes'
import { balanceHistory } from '../../domain/cash'
import { cashCsv } from '../../domain/csv'
import { formatDate } from '../../domain/format'
import { idOf } from '../../domain/numbers'
import { downloadText } from '../../lib/download'
import { Amount, Button, DataState, EmptyState, IconButton, List, ListRow, Page, SkeletonList } from '../../ui'

/** Tutti i saldi registrati, dal più recente. */
export default function CashHistory() {
  const sheet = useSheet()
  const back = useBack(paths.savings)
  const cash = useCash()
  const remove = useUndoableDelete()
  const visible = useWithoutPendingDeletes('cash', cash.data)
  const rows = useMemo(() => balanceHistory(visible), [visible])

  return (
    <Page
      title="Storico saldo"
      back={{ label: 'Risparmi', onClick: back }}
      actions={
        <IconButton
          label="Scarica CSV dello storico"
          icon={<FiDownload />}
          disabled={!cash.data.length}
          onClick={() => downloadText(`storico-cash-${new Date().toISOString().slice(0, 10)}.csv`, cashCsv(cash.data))}
        />
      }
    >
      <DataState
        status={cash.status}
        onRetry={cash.retry}
        skeleton={<SkeletonList rows={6} />}
        isEmpty={!rows.length}
        empty={
          <EmptyState
            title="Nessun saldo registrato"
            action={<Button onClick={() => sheet.open('saldo')}>Aggiungi saldo</Button>}
          />
        }
      >
        <List label="Saldi registrati">
          {rows.map(({ cash: record, date, total }) => (
            <ListRow
              key={idOf(record)}
              onClick={() => sheet.open('saldo', idOf(record))}
              title={formatDate(date) ?? 'Data non disponibile'}
              trailing={<Amount value={total} size="sm" />}
              actions={[
                { label: 'Modifica', icon: <FiEdit2 />, onAction: () => sheet.open('saldo', idOf(record)) },
                {
                  label: 'Elimina',
                  icon: <FiTrash2 />,
                  tone: 'destructive',
                  onAction: () => remove('cash', [record], `Saldo del ${formatDate(date)} eliminato`),
                },
              ]}
            />
          ))}
        </List>
      </DataState>
    </Page>
  )
}
