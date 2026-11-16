import { useState } from 'react'
import { FiCoffee, FiEdit2, FiHome, FiShoppingBag, FiTrash2, FiTruck } from 'react-icons/fi'
import { useNavigate } from 'react-router-dom'
import { paths, useBack } from '../../app/navigation'
import { accentPalette, useTheme, type ThemeMode } from '../../app/theme'
import {
  Amount,
  BottomSheet,
  Button,
  Card,
  Chip,
  EmptyState,
  ErrorState,
  List,
  ListRow,
  Page,
  SectionTitle,
  SegmentedControl,
  SkeletonCard,
  SkeletonList,
  useToast,
} from '../../ui'

const sampleRows = [
  { id: '1', title: 'Supermercato', subtitle: '14 nov', amount: -54.3, icon: <FiShoppingBag /> },
  { id: '2', title: 'Bar', subtitle: '13 nov', amount: -2.5, icon: <FiCoffee /> },
  { id: '3', title: 'Affitto box', subtitle: '1 nov', amount: -100, icon: <FiHome /> },
  {
    id: '4',
    title: 'Tagliando auto con nome molto lungo che va troncato',
    subtitle: '28 ott',
    amount: -320,
    icon: <FiTruck />,
  },
]

/** Catalogo dei componenti del design system (solo per provarli: raggiungibile da Altro in sviluppo). */
export default function CatalogView() {
  const back = useBack(paths.more)
  const navigate = useNavigate()
  const toast = useToast()
  const { theme, setTheme, color, setColor } = useTheme()
  const [rows, setRows] = useState(sampleRows)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [chip, setChip] = useState('casa')
  const [period, setPeriod] = useState<'mese' | 'anno'>('mese')

  const remove = (id: string) => {
    const index = rows.findIndex((row) => row.id === id)
    const removed = rows[index]
    if (!removed) return
    setRows((current) => current.filter((row) => row.id !== id))
    toast({
      message: `${removed.title} eliminata`,
      action: {
        label: 'Annulla',
        onAction: () => setRows((current) => [...current.slice(0, index), removed, ...current.slice(index)]),
      },
    })
  }

  return (
    <Page title="Componenti" subtitle="Design system di My Gesture" back={{ label: 'Altro', onClick: back }}>
      <SegmentedControl<ThemeMode>
        label="Tema"
        value={theme}
        onChange={setTheme}
        options={[
          { value: 'system', label: 'Sistema' },
          { value: 'light', label: 'Chiaro' },
          { value: 'dark', label: 'Scuro' },
        ]}
      />
      <div className="flex flex-wrap gap-2" role="group" aria-label="Colore principale">
        {accentPalette.map((item) => (
          <button
            key={item}
            type="button"
            aria-label={`Colore ${item}`}
            aria-pressed={item === color}
            onClick={() => setColor(item)}
            className="size-11 rounded-full border-4 border-surface"
            style={{ background: item, boxShadow: item === color ? `0 0 0 2px ${item}` : undefined }}
          />
        ))}
      </div>

      <SectionTitle>Card e importi</SectionTitle>
      <Card title="Saldo attuale" to={paths.savings} linkLabel="Saldo attuale: apri lo storico">
        <Amount value={14500} size="xl" />
        <p className="mt-2 flex items-center gap-2 text-[15px] text-muted">
          <Amount value={900} tone="delta" size="sm" /> dal 28 ottobre
        </p>
      </Card>
      <Card title="Questo mese">
        <div className="flex justify-between">
          <span className="text-muted">Entrate</span>
          <Amount value={2500} />
        </div>
        <div className="flex justify-between">
          <span className="text-muted">Uscite</span>
          <Amount value={-1196.8} />
        </div>
        <div className="flex justify-between">
          <span className="text-muted">Variazione negativa</span>
          <Amount value={-42.1} tone="delta" />
        </div>
      </Card>

      <SectionTitle>Lista con swipe</SectionTitle>
      <p className="px-1 text-[13px] text-muted">Scorri una riga verso sinistra (su iPhone) per vedere le azioni.</p>
      {rows.length ? (
        <List label="Ultimi movimenti">
          {rows.map((row) => (
            <ListRow
              key={row.id}
              icon={row.icon}
              title={row.title}
              subtitle={row.subtitle}
              trailing={<Amount value={row.amount} />}
              onClick={() => toast({ message: `Hai toccato ${row.title}`, tone: 'info' })}
              actions={[
                { label: 'Modifica', icon: <FiEdit2 />, onAction: () => toast({ message: 'Modifica', tone: 'info' }) },
                { label: 'Elimina', icon: <FiTrash2 />, tone: 'destructive', onAction: () => remove(row.id) },
              ]}
            />
          ))}
        </List>
      ) : (
        <EmptyState
          title="Nessun movimento"
          message="Importa l'estratto conto per vedere qui i movimenti."
          action={<Button onClick={() => setRows(sampleRows)}>Ripristina esempio</Button>}
        />
      )}

      <SectionTitle>Controlli</SectionTitle>
      <SegmentedControl
        label="Periodo"
        value={period}
        onChange={setPeriod}
        options={[
          { value: 'mese', label: 'Mensile' },
          { value: 'anno', label: 'Annuale' },
        ]}
      />
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {[
          { id: 'casa', label: 'Casa', icon: <FiHome /> },
          { id: 'auto', label: 'Auto', icon: <FiTruck /> },
          { id: 'cibo', label: 'Cibo', icon: <FiCoffee /> },
          { id: 'acquisti', label: 'Acquisti', icon: <FiShoppingBag /> },
        ].map((item) => (
          <Chip key={item.id} icon={item.icon} selected={chip === item.id} onClick={() => setChip(item.id)}>
            {item.label}
          </Chip>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Button onClick={() => setSheetOpen(true)}>Apri foglio</Button>
        <Button variant="secondary" onClick={() => toast({ message: 'Spesa salvata' })}>
          Toast
        </Button>
        <Button variant="destructive" onClick={() => toast({ message: 'Errore di salvataggio', tone: 'error' })}>
          Errore
        </Button>
        <Button variant="plain" onClick={() => navigate(paths.home)}>
          Vai a Oggi
        </Button>
      </div>

      <SectionTitle>Stati</SectionTitle>
      <SkeletonCard lines={2} />
      <SkeletonList rows={3} />
      <ErrorState onRetry={() => toast({ message: 'Riprovo…', tone: 'info' })} />

      <BottomSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title="Nuova spesa"
        footer={
          <Button block onClick={() => setSheetOpen(false)}>
            Salva
          </Button>
        }
      >
        <label className="block text-[13px] font-medium text-muted" htmlFor="catalog-amount">
          Importo
        </label>
        <input
          id="catalog-amount"
          inputMode="decimal"
          placeholder="0,00"
          className="tabular mt-1 w-full rounded-xl bg-surface-2 px-4 py-3 text-[34px] font-bold outline-none"
        />
        <p className="mt-3 text-[15px] text-muted">Trascina la maniglia verso il basso o tocca fuori per chiudere.</p>
      </BottomSheet>
    </Page>
  )
}
