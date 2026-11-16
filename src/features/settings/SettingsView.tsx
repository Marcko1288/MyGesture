import { useCallback, useEffect, useState } from 'react'
import { FiLogOut, FiTag } from 'react-icons/fi'
import { paths, useBack } from '../../app/navigation'
import { accentPalette, useTheme, type ThemeMode } from '../../app/theme'
import { signOut, useAuth, useUserId } from '../../data/auth'
import {
  enablePushNotifications,
  getPushStatus,
  sendTestNotification,
  syncPushToken,
  type PushStatus,
} from '../../data/push'
import { useCategoryRules } from '../../data/settings'
import { Button, Card, List, ListRow, Page, SectionTitle, SegmentedControl, Skeleton } from '../../ui'

const permissionLabels: Record<string, string> = {
  granted: 'Concesso',
  denied: 'Negato',
  default: 'Non ancora richiesto',
  unsupported: 'Non disponibile',
}

function formatDateTime(value: string | null | undefined) {
  const date = value ? new Date(value) : null
  return date && !Number.isNaN(date.getTime())
    ? date.toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' })
    : '—'
}

const colorNames: Record<string, string> = {
  '#4f46e5': 'Indaco',
  '#2563eb': 'Blu',
  '#0891b2': 'Ciano',
  '#059669': 'Smeraldo',
  '#65a30d': 'Lime',
  '#ca8a04': 'Ambra',
  '#ea580c': 'Arancione',
  '#dc2626': 'Rosso',
  '#db2777': 'Rosa',
  '#9333ea': 'Viola',
}

function Appearance() {
  const { theme, setTheme, color, setColor } = useTheme()
  return (
    <>
      <SectionTitle>Aspetto</SectionTitle>
      <Card>
        <p className="mb-2 text-[15px] font-semibold text-muted">Tema</p>
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
        <p className="mt-4 mb-2 text-[15px] font-semibold text-muted" id="color-label">
          Colore principale
        </p>
        <div role="radiogroup" aria-labelledby="color-label" className="flex flex-wrap gap-2">
          {accentPalette.map((item) => (
            <button
              key={item}
              type="button"
              role="radio"
              aria-checked={item === color}
              aria-label={colorNames[item] ?? item}
              onClick={() => setColor(item)}
              className="size-11 rounded-full border-4 border-surface"
              style={{ background: item, boxShadow: item === color ? `0 0 0 2px ${item}` : undefined }}
            />
          ))}
        </div>
      </Card>
    </>
  )
}

function Notifications() {
  const userId = useUserId()
  const [status, setStatus] = useState<PushStatus | null>(null)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  const refresh = useCallback(async () => {
    try {
      setStatus(await getPushStatus(userId))
    } catch (error) {
      setMessage((error as Error).message || 'Impossibile leggere lo stato delle notifiche.')
    }
  }, [userId])

  useEffect(() => {
    refresh()
  }, [refresh])

  async function run(action: () => Promise<string>) {
    setBusy(true)
    setMessage('')
    try {
      setMessage(await action())
    } catch (error) {
      setMessage((error as Error).message || 'Operazione non riuscita.')
    } finally {
      setBusy(false)
      refresh()
    }
  }

  const granted = status?.permission === 'granted'
  return (
    <>
      <SectionTitle>Notifiche</SectionTitle>
      <p className="-mt-1 mb-1 px-1 text-[13px] text-muted">
        Avviso 15, 7 e 1 giorno prima della scadenza di un abbonamento.
      </p>
      {status ? (
        <List label="Stato delle notifiche">
          <ListRow
            title="Permesso"
            trailing={<span className="text-muted">{permissionLabels[status.permission] ?? status.permission}</span>}
            chevron={false}
          />
          <ListRow
            title="Questo dispositivo"
            trailing={
              <span className={status.deviceToken ? 'text-positive' : 'text-muted'}>
                {status.deviceToken ? 'Registrato' : 'Non registrato'}
              </span>
            }
            chevron={false}
          />
          <ListRow
            title="Ultimo aggiornamento"
            trailing={<span className="text-muted">{formatDateTime(status.deviceToken?.updatedAt)}</span>}
            chevron={false}
          />
          <ListRow
            title="Dispositivi registrati"
            trailing={<span className="text-muted">{status.totalTokens}</span>}
            chevron={false}
          />
        </List>
      ) : (
        <Skeleton className="h-44 rounded-2xl" />
      )}
      {status && !status.supported && <p className="px-1 text-[15px] text-warning">{status.reason}</p>}
      <div className="flex flex-col gap-2">
        {status?.supported && !(granted && status.deviceToken) && (
          <Button
            onClick={() =>
              run(async () => (await enablePushNotifications(userId), 'Notifiche attivate su questo dispositivo.'))
            }
            disabled={busy}
          >
            Attiva notifiche
          </Button>
        )}
        {status?.supported && granted && (
          <Button
            variant="secondary"
            disabled={busy}
            onClick={() =>
              run(async () =>
                (await syncPushToken(userId, { force: true }))
                  ? 'Token aggiornato.'
                  : 'Token non aggiornato: controlla il permesso.',
              )
            }
          >
            Aggiorna token
          </Button>
        )}
        <Button
          variant="secondary"
          disabled={busy || !status?.totalTokens}
          onClick={() =>
            run(async () => {
              const result = await sendTestNotification()
              const removed = result.removed ? `, ${result.removed} token non più validi rimossi` : ''
              const errors = result.errors?.length ? ` Errori: ${result.errors.join(', ')}.` : ''
              return `Notifica inviata a ${result.sent} dispositivi su ${result.tokens}${removed}.${errors}`
            })
          }
        >
          Invia notifica di prova
        </Button>
      </div>
      {message && (
        <p role="status" className="px-1 text-[15px]">
          {message}
        </p>
      )}
    </>
  )
}

/** Tema, colore, notifiche, regole dell'estratto conto e account. */
export default function SettingsView() {
  const back = useBack(paths.more)
  const { user } = useAuth()
  const rules = useCategoryRules()
  return (
    <Page title="Impostazioni" back={{ label: 'Altro', onClick: back }}>
      <Appearance />
      <Notifications />
      <SectionTitle>Estratto conto</SectionTitle>
      <List label="Estratto conto">
        <ListRow
          to={paths.categoryRules}
          icon={<FiTag />}
          title="Regole di categorizzazione"
          subtitle={`${rules.rules.length} regole${rules.isDefault ? ' · predefinite' : ' · personalizzate'}`}
        />
      </List>
      <SectionTitle>Account</SectionTitle>
      <List label="Account">
        <ListRow title={user?.email ?? 'Utente'} subtitle="Accesso con email e password" chevron={false} />
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
