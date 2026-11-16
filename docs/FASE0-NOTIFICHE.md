# Fase 0 — Hotfix notifiche push

## Esito delle ipotesi

| Ipotesi | Esito | Correzione |
|---|---|---|
| Token mai rinnovato | **Confermata dal codice**: `getToken` veniva chiamato solo dal pulsante | `syncPushToken()` all'avvio e al ritorno in primo piano (al massimo una volta l'ora), con `deviceId` e rimozione dei token vecchi dello stesso dispositivo |
| La function cancella i token per qualsiasi errore | **Confermata dal codice** | Cancella solo per `registration-token-not-registered` / `invalid-registration-token`; gli altri errori vanno nel log |
| Runtime Node 20 | **Confermata** | Node 22, `firebase-admin` 14.5, `firebase-functions` 7.4 (`firebase-admin` 14 richiede gli import modulari: aggiornati) |
| Service worker | Registrazione corretta, ma nessun gestore del tocco | `notificationclick` (porta l'app in primo piano o la apre); `onBackgroundMessage` per i messaggi solo-dati; payload `webpush.notification` con titolo, corpo e icona |
| `VITE_FIREBASE_VAPID_KEY` | **Presente** nella build versionata in `dist/` (il bundle contiene la chiave `BJ31NDYF0N4I…`). Non posso verificare l'ambiente di build di produzione | Le Impostazioni ora mostrano un messaggio esplicito se la chiave manca |
| Log della function | **Non verificabile da qui**: CLI non autenticata | Vedi i comandi sotto |

### Altri problemi trovati
1. **`index.html` non collegava il manifest** (`<link rel="manifest">` assente, così come `apple-touch-icon` e i meta `apple-mobile-web-app-*`). Su iOS le push web funzionano solo nelle web app installate in Home con `display: standalone`. Se l'icona è stata aggiunta (o ri-aggiunta) dopo che il link è sparito, iOS l'ha installata come semplice segnalibro e `PushManager` non esiste. **Aggiunti.**
2. **Giorni mancanti sbagliati di 1** nella function: le scadenze sono salvate come mezzanotte di Roma (es. `2026-11-23T23:00Z` = 24 novembre), ma i giorni venivano contati in UTC. Esempio verificato: il 17/11, per una scadenza al 24/11, la vecchia logica dava 6 giorni invece di 7, quindi l'avviso "tra 7 giorni" arrivava con un giorno di anticipo. **Ora il calcolo usa `Europe/Rome`.**
3. `firebase.messaging()` veniva creato all'avvio: sui browser non supportati poteva sollevare un'eccezione. Ora l'istanza è creata in modo lazy e protetto.

**Causa più probabile** (da confermare con i log): un invio fallito ha cancellato il token (anche per un errore temporaneo), e il token non è mai stato registrato di nuovo. Se l'icona in Home è stata reinstallata di recente, a questo si aggiunge il manifest mancante.

## Cosa fare tu

1. Leggi i log degli ultimi giorni (prima del deploy):
   ```bash
   firebase functions:log --only sendSubscriptionExpiryNotifications --project mygestion-446b9
   ```
   Cerca esecuzioni giornaliere, errori `messaging/...` e se `PushToken` era vuoto.
2. Controlla su Firestore se `NewMyDB/{tuo uid}/PushToken` contiene documenti.
3. Deploy delle function (Node 22):
   ```bash
   cd functions && npm ci && cd .. && firebase deploy --only functions --project mygestion-446b9
   ```
4. Ripubblica il frontend dove lo ospiti oggi, con `VITE_FIREBASE_VAPID_KEY` nell'ambiente di build.
5. Sull'iPhone: apri l'app **dall'icona in Home** → Impostazioni → Notifiche. Devi vedere "Permesso: Concesso" e "Token di questo dispositivo: Registrato" → **Invia notifica di prova**.
   - Se compare "Su iPhone le notifiche funzionano solo aprendo l'app dall'icona…" anche se l'hai aperta dalla Home: rimuovi l'icona, apri il sito in Safari, Condividi → Aggiungi alla schermata Home, apri dall'icona e attiva le notifiche.
6. Test del rinnovo automatico: cancella da console il documento in `PushToken`, chiudi l'app dal multitasking, riaprila → il documento ricompare con un nuovo `updatedAt`.
