import { useCallback, useEffect, useState } from 'react'
import { enablePushNotifications, getPushStatus, sendTestNotification, syncPushToken } from '../../data/push'

const palette = [
  '#4f46e5',
  '#2563eb',
  '#0891b2',
  '#059669',
  '#65a30d',
  '#ca8a04',
  '#ea580c',
  '#dc2626',
  '#db2777',
  '#9333ea',
]
const permissionLabels = {
  granted: 'Concesso',
  denied: 'Negato',
  default: 'Non ancora richiesto',
  unsupported: 'Non disponibile',
}

function formatDateTime(value) {
  const date = value ? new Date(value) : null
  return date && !Number.isNaN(date.getTime())
    ? date.toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' })
    : '—'
}

function PushSettings({ userId }) {
  const [status, setStatus] = useState(null)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  const refresh = useCallback(async () => {
    try {
      setStatus(await getPushStatus(userId))
    } catch (error) {
      setMessage(error.message || 'Impossibile leggere lo stato delle notifiche.')
    }
  }, [userId])

  useEffect(() => {
    refresh()
  }, [refresh])

  async function run(action) {
    setBusy(true)
    setMessage('')
    try {
      setMessage(await action())
    } catch (error) {
      setMessage(error.message || 'Operazione non riuscita.')
    } finally {
      setBusy(false)
      refresh()
    }
  }

  const enable = () =>
    run(async () => {
      await enablePushNotifications(userId)
      return 'Notifiche push attivate su questo dispositivo.'
    })
  const resync = () =>
    run(async () => {
      const result = await syncPushToken(userId, { force: true })
      return result ? 'Token aggiornato.' : 'Token non aggiornato: controlla il permesso.'
    })
  const test = () =>
    run(async () => {
      const result = await sendTestNotification()
      const removed = result.removed ? `, ${result.removed} token non più validi rimossi` : ''
      const errors = result.errors?.length ? ` Errori: ${result.errors.join(', ')}.` : ''
      return `Notifica inviata a ${result.sent} dispositivi su ${result.tokens}${removed}.${errors}`
    })

  const granted = status?.permission === 'granted'
  const rows = status
    ? [
        ['Permesso', permissionLabels[status.permission] ?? status.permission],
        ['Token di questo dispositivo', status.deviceToken ? 'Registrato' : 'Non registrato'],
        ['Ultimo aggiornamento token', formatDateTime(status.deviceToken?.updatedAt)],
        ['Dispositivi registrati', String(status.totalTokens)],
      ]
    : []

  return (
    <>
      <h2 className="color-heading">Notifiche</h2>
      <p>Ricevi un avviso 15, 7 e 1 giorno prima della scadenza di un abbonamento.</p>
      {status && (
        <dl
          style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '6px 16px', margin: '16px 0', fontSize: 14 }}
        >
          {rows.map(([label, value]) => (
            <div key={label} style={{ display: 'contents' }}>
              <dt style={{ color: 'var(--text-muted)' }}>{label}</dt>
              <dd style={{ margin: 0, fontWeight: 650 }}>{value}</dd>
            </div>
          ))}
        </dl>
      )}
      {status && !status.supported && <p>{status.reason}</p>}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
        {status?.supported && !(granted && status.deviceToken) && (
          <button type="button" className="theme-choice" onClick={enable} disabled={busy}>
            {busy ? 'Attendere…' : 'Attiva notifiche push'}
          </button>
        )}
        {status?.supported && granted && (
          <button type="button" className="theme-choice" onClick={resync} disabled={busy}>
            Aggiorna token
          </button>
        )}
        <button type="button" className="theme-choice" onClick={test} disabled={busy || !status?.totalTokens}>
          Invia notifica di prova
        </button>
      </div>
      {message && <p role="status">{message}</p>}
    </>
  )
}

export default function SettingsView({ theme, setTheme, color, setColor, userId }) {
  return (
    <>
      <div className="section-heading">
        <h1>Impostazioni</h1>
      </div>
      <section className="settings-card">
        <h2>Aspetto</h2>
        <p>Scegli il tema dell'applicazione.</p>
        <div className="theme-options">
          {[
            { value: 'system', label: 'Default', text: 'Usa il tema del dispositivo' },
            { value: 'light', label: 'Light', text: 'Sempre chiaro' },
            { value: 'dark', label: 'Night', text: 'Sempre scuro' },
          ].map((item) => (
            <button
              key={item.value}
              className={theme === item.value ? 'theme-choice selected' : 'theme-choice'}
              onClick={() => setTheme(item.value)}
            >
              <b>{item.label}</b>
              <small>{item.text}</small>
            </button>
          ))}
        </div>
        <h2 className="color-heading">Colore principale</h2>
        <p>Scegli il colore dell'interfaccia.</p>
        <div className="color-palette">
          {palette.map((item) => (
            <button
              key={item}
              className={color === item ? 'color-choice selected' : 'color-choice'}
              style={{ background: item }}
              aria-label={`Seleziona ${item}`}
              onClick={() => setColor(item)}
            />
          ))}
        </div>
        <PushSettings userId={userId} />
      </section>
    </>
  )
}
