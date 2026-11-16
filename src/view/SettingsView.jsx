import { useState } from 'react'
import { enablePushNotifications } from '../firebase/pushNotifications.js'

const palette = ['#4f46e5', '#2563eb', '#0891b2', '#059669', '#65a30d', '#ca8a04', '#ea580c', '#dc2626', '#db2777', '#9333ea']

export default function SettingsView({ theme, setTheme, color, setColor, userId }) {
  const [pushMessage, setPushMessage] = useState('')
  const [enablingPush, setEnablingPush] = useState(false)
  async function enablePush() {
    setEnablingPush(true)
    setPushMessage('')
    try { await enablePushNotifications(userId); setPushMessage('Notifiche push attivate.') } catch (error) { setPushMessage(error.message || 'Non e stato possibile attivare le notifiche.') } finally { setEnablingPush(false) }
  }
  return <><div className="section-heading"><h1>Impostazioni</h1></div><section className="settings-card"><h2>Aspetto</h2><p>Scegli il tema dell'applicazione.</p><div className="theme-options">{[{ value: 'system', label: 'Default', text: 'Usa il tema del dispositivo' }, { value: 'light', label: 'Light', text: 'Sempre chiaro' }, { value: 'dark', label: 'Night', text: 'Sempre scuro' }].map((item) => <button key={item.value} className={theme === item.value ? 'theme-choice selected' : 'theme-choice'} onClick={() => setTheme(item.value)}><b>{item.label}</b><small>{item.text}</small></button>)}</div><h2 className="color-heading">Colore principale</h2><p>Scegli il colore dell'interfaccia.</p><div className="color-palette">{palette.map((item) => <button key={item} className={color === item ? 'color-choice selected' : 'color-choice'} style={{ background: item }} aria-label={`Seleziona ${item}`} onClick={() => setColor(item)} />)}</div><h2 className="color-heading">Notifiche</h2><p>Ricevi un avviso 15, 7 e 1 giorno prima della scadenza.</p><button type="button" className="theme-choice" onClick={enablePush} disabled={enablingPush}>{enablingPush ? 'Attivazione...' : 'Attiva notifiche push'}</button>{pushMessage && <p>{pushMessage}</p>}</section></>
}
