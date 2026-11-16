# MyGesture — Analisi dello stato attuale

> Stato del repository al commit `4dee40a` (`main`, 16/11/2026). La storia git contiene un solo commit ("Add files via upload"), quindi non è possibile risalire a com'era il codice quando le notifiche funzionavano.

## 1. Panoramica

| Voce | Stato attuale |
|---|---|
| Stack | React 19 + Vite 8, JavaScript (`.jsx`), Tailwind v4 importato ma usato quasi solo tramite CSS scritto a mano |
| Firebase | SDK **compat 9.22.2 da CDN** in `index.html` → `window.firebase` (auth, firestore, messaging) |
| Config Firebase | Scritta nel codice in `src/firebase/firebase.jsx` **e** in `public/firebase-messaging-sw.js` |
| Navigazione | `src/view/HubView.jsx`: **26 `useState`** e un ternario a cascata di 20 rami. Nessun URL, nessuna history: il gesto "indietro" di iOS esce dall'app e il ricaricamento riporta sempre in Home |
| Stato dati | Niente Redux (le dipendenze `react-redux` e `react-router-dom` sono installate ma **non usate**). I dati vivono nello stato di `HubView` e passano alle viste come prop |
| Accesso dati | `src/store/firestoreStore.jsx`: CRUD generico + `onSnapshot` per entità |
| Stili | 17 file `.css` per vista (quasi tutti minificati su una riga) + `App.css` con molti `!important` |
| Hosting | `firebase.json` contiene solo `functions`. `public/_redirects` (anche in `dist/`) indica che **oggi l'app è probabilmente servita da Netlify** |
| Build versionata | `dist/` è nel repository (11 file). **Non esiste un `.gitignore`** |
| Test / lint | Nessun test. `oxlint` configurato senza file di configurazione |
| Functions | `functions/index.js`: una sola function schedulata (Node 20, `firebase-admin` 12, `firebase-functions` 6) |

## 2. Funzionalità esistenti

| Area | Vista | Cosa fa |
|---|---|---|
| Accesso | `LoginView` | Email e password (`signInWithEmailAndPassword`). Nessun recupero password |
| Home | `HomeView` | 4 card: Ultimo saldo (+ delta), Spese dell'anno, Andamento Spese (entrate/uscite/salvadanaio del **mese scorso**), numero di abbonamenti in scadenza |
| Risparmi | `SavingsView`, `CashHistoryView`, `CashDetailView` | Grafico a barre del saldo (ultimi 4 mesi o 4 anni) e delle variazioni; storico con esportazione CSV; form Cash con pulsante "Importa Spese" che mette in `anticipo` il totale delle spese dell'anno |
| Spese | `ExpensesView`, `AllGroupsView`, `GroupBuysView`, `GroupDetailView`, `BuyDetailView` | Grafico a ciambella per gruppo (solo `all === true`), elenco dei gruppi esclusi, elenco di tutti i gruppi, **"Pareggio" di fine anno**, lista spese del gruppo con filtri Tutto/Anno corrente/Passati/Futuri, form spesa con ricorrenza, eliminazione singola o di tutta la serie |
| Estratto conto | `StatementView`, `StatementCategoryView`, `StatementCategoryTrendView`, `StatementDetailView`, `UploadStatementView` | Ciambella per `new_category` del mese scelto (ultimi 6 mesi + corrente, di default il mese scorso) con filtro Entrate/Uscite/Tutto; esportazione CSV; lista per categoria; andamento della categoria negli ultimi 4 mesi; dettaglio movimento; import XLSX |
| Abbonamenti | `SubscriptionsView`, `SubscriptionDetailView` | Filtri Tutti/Passati/Attivi/In scadenza; form; **Rinnovo** (nuovo record con lo stesso `uid_father`, da `data_fine + 1 giorno` per un anno) |
| Impostazioni | `SettingsView` | Tema (sistema/chiaro/scuro), colore principale (palette di 10), pulsante "Attiva notifiche push" |
| Notifiche | `functions/index.js` | Ogni giorno alle 9:00 Europe/Rome: avviso 15/7/1 giorni prima della scadenza di un abbonamento non rinnovato |

Funzionalità presenti nel codice ma **non citate nel prompt**, da preservare: "Pareggio" di fine anno dei gruppi, "Importa Spese" nel form Cash, esportazioni CSV (storico saldo ed estratto conto), andamento di una categoria su 4 mesi, filtri delle spese del gruppo (incluse le future).

## 3. Modello dati (Firestore)

Percorso: `NewMyDB/{authUid}/{Collection}/{docId}`. Per tutte le entità create dall'app, `docId === uid`. `createRecord` aggiunge a ogni documento un campo **`ownerId`** (= uid Firebase) che non compare in `class/*.jsx`: va mantenuto.

| Collezione | Prefisso `uid` | Campi | Note |
|---|---|---|---|
| `Cash` | `CASH_` | `conto`, `anticipo`, `otherp`, `otherm` (number), `data_valore`, `data_ins`, `data_modify` | ⚠️ `data_valore` è salvato come **`YYYY-MM-DD`** (valore di `<input type="date">`), non come ISO completo; i record vecchi possono essere ISO o `Timestamp` |
| `Buy` | `BUY_` | `name`, `amount`, `group` (uid del Group), `icon` (0–9), `repeat`, `uid_father`, `round` (`MEN`/`SET`/`''`), `type_round` (`DAT`/`INI`/`FIN` o `LUN`…`DOM`), `data_valore`, `data_fine`, `data_ins`, `data_modify` | Per una serie il primo record ha `uid === uid_father`. Per le spese non ricorrenti `data_fine` vale comunque "adesso" |
| `Group` | `GRP_` | `name`, `icon` (0–9), `all` (bool, default `true`) | ⚠️ **Nessuna schermata permette di cambiare `all`**: oggi si modifica solo a mano da console |
| `Bank` | `BANK_` | `data_valore` (ISO a mezzogiorno locale), `operation`, `detail`, `card`, `accounting`, `category` (categoria della banca), `new_category` (calcolata), `currency`, `amount` (segno: + entrata, − uscita) | `createBank` **ricalcola sempre** `new_category` e ignora un eventuale valore passato |
| `Subscription` | `SUB_` | `name`, `amount`, `data_inizio`, `data_fine` (ISO della mezzanotte locale), `uid_father` | Primo record: `uid_father = ''`; rinnovi: `uid_father = uid` del capostipite |
| `Partner` | `PAT_` | `email`, `nome`, `cognome`, `username`, `imageUrl` | Non usata da nessuna vista. Bug minore: `username` prende il valore di `email` |
| `PushToken` | id = token | `token`, `updatedAt` (ISO) | Nessun riferimento al dispositivo: impossibile capire quale token appartiene a quale iPhone |

`docId === uid` vale per le entità create dall'app; i dati più vecchi potrebbero non rispettarlo. Il codice gestisce già entrambi i casi (`uid ?? id`) e la nuova versione farà lo stesso.

Date: `utils/firestoreDate.js#toFirestoreDate` accetta `Date`, `Timestamp` (con `toDate`), oggetti `{seconds, nanoseconds}` / `{_seconds}`, numeri (secondi o millisecondi) e stringhe.

## 4. Regole di business (come sono implementate oggi)

### Saldo (Cash)
- Totale = `conto + anticipo + otherp − otherm` (valori non numerici = 0).
- I record sono ordinati per `data_valore ?? data_ins` decrescente: `[0]` = saldo attuale, `[1]` = precedente, delta = differenza. Con due record nello stesso giorno l'ordine non è definito.
- Storico mensile/annuale: per ogni mese/anno vale il record con la data più alta; il grafico ne mostra solo gli ultimi 4. Le variazioni sono le differenze tra periodi consecutivi.

### Spese (Buy/Group)
- "Spese dell'anno" = somma degli `amount` con `data_valore` tra il 1° gennaio 00:00 e oggi 23:59:59.999, e `group` in un gruppo con `all === true` (un gruppo senza il campo `all` è escluso sia dai totali sia dalla lista "Gruppi esclusi", che filtra su `all === false`).
- `buyPeriod`: `past` (prima del 1/1), `current`, `future` (dopo oggi).
- **Ricorrenze** (`recurringDates`):
  - `round === 'SET'`: prima occorrenza = primo `type_round` (LUN…DOM) a partire da `data_valore` incluso, poi ogni 7 giorni fino a `data_fine` inclusa.
  - Altrimenti (mensile): per ogni mese da quello di `data_valore` fino a `data_fine`: `INI` = giorno 1, `FIN` = ultimo giorno, altro (`DAT`) = giorno di `data_valore`, limitato all'ultimo giorno del mese. Mantiene l'ora di `data_valore` e scarta le date fuori da `[start, end]`.
  - Il primo record della serie ha `uid = uid_father = rootUid`; i record sono scritti uno per volta (niente batch).
- Eliminazione: se `uid_father` è valorizzato puoi scegliere "solo questa" oppure "tutta la serie" (`uid === famiglia || uid_father === famiglia`).
- Un gruppo non si può eliminare finché ha spese collegate.
- **Pareggio** (`AllGroupsView`): per ogni gruppo con totale dell'anno precedente ≠ 0 crea `Pareggio {anno-1}` (−totale, 31/12 alle 12:00) e `Riporto {anno}` (+totale, 1/1 alle 12:00). Non è idempotente: se lo premi due volte, duplica.

### Estratto conto (Bank)
- Import: cerca in ogni foglio la riga di intestazione con `data`, `operazione` e `importo`; le colonne sono lette **per posizione** (0 = Data … 7 = Importo).
- Date: oggetto `Date` (grazie a `cellDates: true`), seriale Excel (`SSF.parse_date_code`) o stringa `M/D/YY(YY)` → mezzogiorno locale in ISO.
- Importo: `Number(valore senza virgole)`; scarta la riga se non è numerico o se la data non è valida → CSV degli errori separato da `;`.
- `new_category` = prima regola a keyword (case-insensitive, `it-IT`) trovata in `operation + ' ' + detail`; default `Spese`. Regole: Salvadanaio, Palestra, Auto, Affitto, Stipendio.
- Viste: filtro Entrate (`amount ≥ 0`), Uscite (`< 0`), Tutto. Con Entrate/Uscite il totale è la somma dei valori assoluti, con Tutto la somma con segno.

### Abbonamenti
- Famiglia = `uid_father || uid || id`. Rinnovo: `data_inizio = data_fine + 1 giorno`, `data_fine = inizio + 1 anno − 1 giorno`.
- **La Home e il filtro "In scadenza" contano gli abbonamenti con `data_fine` tra oggi e oggi + 1 mese di calendario, senza escludere quelli già rinnovati.** Solo la Cloud Function esclude i rinnovati (rinnovo = stessa famiglia con `data_inizio > scadenza`).
- "Attivi" = `data_inizio ≤ oggi` (o assente) e `data_fine ≥ oggi`.

## 5. Verifica dei problemi segnalati nel prompt

| # | Segnalazione | Esito |
|---|---|---|
| 1 | `HubView` con ~20 `useState` e un ternario a cascata, nessun URL | ✅ Confermato (26 `useState`) |
| 2 | Firebase compat 9.22 da CDN | ✅ Confermato (4 script in `index.html`, più `importScripts` nel service worker) |
| 3 | `firebase.json` senza `hosting`, `_redirects` di Netlify | ✅ Confermato |
| 4 | `cashStore.subscribe` senza unsubscribe | ✅ Confermato: l'effetto in `HubView.jsx:74` non restituisce nulla, quindi a ogni cambio utente (e due volte con StrictMode in sviluppo) resta un listener in più |
| 5 | Import XLSX riga per riga, senza deduplica | ✅ Confermato: un `await bankStore.create` per riga, nessun controllo dei duplicati |
| 6 | Card "Andamento Spese" filtra su `category` | ✅ Confermato (`HomeView.jsx:58`): confronta con `'Investimenti, BDR e Salvadanaio'` sulla categoria della banca. Va usato `new_category === 'Salvadanaio'` |
| 7 | Config Firebase scritta nel codice | ✅ Confermato, anche nel service worker |
| 8 | Nessun `firestore.rules` / `firestore.indexes.json` | ✅ Confermato |
| 9 | `public/` e `dist/` entrambi versionati | ✅ Confermato; manca anche un `.gitignore` |

## 6. Altri problemi trovati

**Notifiche push / PWA**
1. ❗ **`index.html` non contiene `<link rel="manifest">`, né `apple-touch-icon`, né i meta `apple-mobile-web-app-*`.** `public/manifest.json` esiste, ma la pagina non lo collega. Su iOS una web app aggiunta alla Home riceve le push solo se è una "Home Screen web app" (manifest con `display: standalone`). Se l'app è stata reinstallata, oppure se iOS rilegge il manifest e non lo trova più, l'icona diventa un semplice segnalibro e `PushManager` non è disponibile. È la causa più probabile insieme al punto 2: va verificata sull'iPhone (vedi la Fase 0).
2. `getToken` viene chiamato solo dal pulsante in Impostazioni: nessun rinnovo automatico del token.
3. La Cloud Function elimina il token per **qualsiasi** errore, anche temporaneo.
4. **Fuso orario nella function**: le date degli abbonamenti sono salvate come mezzanotte locale (es. `2026-12-01T23:00:00.000Z` per il 2 dicembre), ma `dayStart` usa il fuso del server (UTC). Risultato: i giorni mancanti risultano sbagliati di 1 e l'avviso "tra 7 giorni" parte con un giorno di anticipo.
5. Il service worker usa l'SDK compat da CDN, ha la config scritta nel codice e non gestisce `notificationclick` (si affida al comportamento predefinito dell'SDK con `fcmOptions.link`).
6. `firebase.messaging?.()` in `firebase.jsx` viene valutato all'avvio: sui browser che non supportano il messaging l'SDK compat può sollevare un'eccezione e bloccare l'intera app (`?.` non intercetta le eccezioni).
7. La chiave VAPID **era presente** nella build in `dist/` (il bundle contiene `vapidKey` = `BJ31NDYF0N4I…`), quindi almeno quella build è stata compilata con la variabile. Non posso verificare l'ambiente di build di produzione (Netlify?).
8. Non posso leggere i log della function: in questo ambiente né il Firebase CLI né `gcloud` sono autenticati. Ti indico il comando nella Fase 0.

**Calcoli e dati**
9. Abbonamenti "in scadenza": la Home/lista e la Cloud Function usano regole diverse (vedi §4).
10. "In scadenza" usa "+1 mese di calendario" e non "+30 giorni".
11. `Cash.data_valore` è salvato come `YYYY-MM-DD`, quindi viene interpretato come mezzanotte UTC. In modifica, `inputDate` usa `toISOString()` (UTC): per i record vecchi salvati come ISO a mezzanotte locale, la data mostrata nel form può risultare il giorno prima.
12. Non c'è nessuna UI per impostare `Group.all`.
13. Il "Pareggio" non è idempotente.
14. Le ricorrenze e l'import sono scritti documento per documento (lenti, non atomici).
15. `createBank` ignora `new_category` in input; `updateRecord` non la ricalcola.

**Tecnici**
16. `updateRecord`/`deleteRecord` fanno un `get` prima di ogni scrittura (una lettura in più, e non funzionano offline).
17. Mancano persistenza offline, stati di caricamento (in Home si vede `--`), stato offline e gestione errori uniforme.
18. Logica di formattazione duplicata in ogni vista (`formatCurrency` ridefinito 10 volte, `cashTotal` 4 volte, liste di icone ripetute con mapping diversi tra Buy e Group).
19. `window.confirm` per le eliminazioni (scomodo su iOS standalone), nessun "annulla".
20. Accessibilità: card cliccabili fatte con `article role=button`, target piccoli, nessun `prefers-reduced-motion`.
21. `react-redux`, `react-router-dom` e `react-icons/bs` sono installati ma inutilizzati (oppure usati per un'icona sola); `src/assets/*` non sono usati.
22. Il favicon è un PNG dichiarato come `image/svg+xml`.
