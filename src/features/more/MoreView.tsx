import { FiBell, FiGrid, FiLogOut, FiSettings, FiTrendingUp } from 'react-icons/fi'
import { paths } from '../../app/navigation'
import { signOut, useAuth } from '../../data/auth'
import { List, ListRow, Page } from '../../ui'

/** Tab "Altro": risparmi, abbonamenti, impostazioni, uscita. */
export default function MoreView() {
  const { user } = useAuth()
  return (
    <Page title="Altro" subtitle={user?.email ?? undefined}>
      <List label="Sezioni">
        <ListRow to={paths.savings} icon={<FiTrendingUp />} title="Risparmi" subtitle="Storico del saldo" />
        <ListRow to={paths.subscriptions} icon={<FiBell />} title="Abbonamenti" subtitle="Scadenze e rinnovi" />
        <ListRow to={paths.settings} icon={<FiSettings />} title="Impostazioni" subtitle="Tema, colore, notifiche" />
      </List>
      {import.meta.env.DEV && (
        <List label="Sviluppo">
          <ListRow to={paths.catalog} icon={<FiGrid />} title="Componenti" subtitle="Catalogo del design system" />
        </List>
      )}
      <List label="Account">
        <ListRow
          onClick={() => signOut()}
          icon={<FiLogOut />}
          iconClassName="bg-negative/12 text-negative"
          title={<span className="text-negative">Esci</span>}
          chevron={false}
        />
      </List>
    </Page>
  )
}
